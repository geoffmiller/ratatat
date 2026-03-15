/**
 * ink-fast/prototypes/ink-stage-profiler.mjs
 *
 * Phase 0 instrumentation prototype for Ink's render pipeline.
 *
 * Measures per-render stage timings for a dense redraw workload:
 *   - Yoga layout (`calculateLayout`)
 *   - Output assembly (`Output.get`)
 *   - Ink render callback total (`onRender.renderTime`)
 *   - stdout write time + bytes
 *
 * Notes:
 * - Uses a synthetic TTY stream that writes to /dev/null by default.
 * - This isolates runtime pipeline behavior from terminal emulator paint latency.
 *
 * Run:
 *   node ink-fast/prototypes/ink-stage-profiler.mjs
 *
 * Optional env:
 *   COLS=80 ROWS=24 WARMUP_RENDERS=20 MEASURE_RENDERS=120 MAX_FPS=1000
 *   WORKLOAD=dense|sparse|unicode
 *   SINK=devnull|memory
 *   PATCH_OUTPUT_REUSE=0|1
 *   OUTPUT_JSON=ink-fast/results/ink-stage-profile.json
 */

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { Writable, PassThrough } from 'node:stream'
import React, { useEffect, useMemo, useState } from 'react'
import { render, Box, Text, useApp } from 'ink'
import Yoga from 'yoga-layout'
import sliceAnsi from 'slice-ansi'
import { styledCharsToString } from '@alcalzone/ansi-tokenize'

const require = createRequire(import.meta.url)
const inkEntryPath = require.resolve('ink')
const inkPackageDir = path.resolve(path.dirname(inkEntryPath), '..')
const outputPath = path.join(inkPackageDir, 'build', 'output.js')
const { default: Output } = await import(pathToFileURL(outputPath).href)

const COLS = Number(process.env.COLS ?? 80)
const ROWS = Number(process.env.ROWS ?? 24)
const WARMUP_RENDERS = Number(process.env.WARMUP_RENDERS ?? 20)
const MEASURE_RENDERS = Number(process.env.MEASURE_RENDERS ?? 120)
const MAX_FPS = Number(process.env.MAX_FPS ?? 1000)
const SINK = process.env.SINK ?? 'devnull'
const WORKLOAD = process.env.WORKLOAD ?? 'dense'
const PATCH_OUTPUT_REUSE = process.env.PATCH_OUTPUT_REUSE === '1'
const OUTPUT_JSON = process.env.OUTPUT_JSON

const TOTAL_UPDATES = WARMUP_RENDERS + MEASURE_RENDERS

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]
}

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 0) {
    return { n: 0, mean: 0, median: 0, p95: 0, min: 0, max: 0 }
  }

  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length

  return {
    n: sorted.length,
    mean,
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  }
}

function fmt(n) {
  return n.toFixed(3)
}

function inWindow(index) {
  return index >= WARMUP_RENDERS && index < WARMUP_RENDERS + MEASURE_RENDERS
}

function ensureRenderRecord(map, index) {
  if (!map.has(index)) {
    map.set(index, {
      layoutMs: 0,
      layoutCalls: 0,
      outputGetMs: 0,
      outputGetCalls: 0,
      renderTotalMs: 0,
      writeMs: 0,
      writeBytes: 0,
      writeCalls: 0,
    })
  }
  return map.get(index)
}

class TimingTtyStream extends Writable {
  constructor({ columns, rows, sink, onWrite }) {
    super()
    this.isTTY = true
    this.columns = columns
    this.rows = rows
    this.fd = 1
    this._sink = sink
    this._onWrite = onWrite
    this._devNullFd = sink === 'devnull' ? fs.openSync('/dev/null', 'w') : null
  }

  _write(chunk, encoding, callback) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding)
    const bytes = data.length

    const t0 = performance.now()

    if (this._sink === 'devnull') {
      fs.writeSync(this._devNullFd, data)
    }

    const dt = performance.now() - t0
    this._onWrite(dt, bytes)
    callback()
  }

  closeSink() {
    if (this._devNullFd !== null) {
      fs.closeSync(this._devNullFd)
      this._devNullFd = null
    }
  }
}

const denseChars = '█▓▒░▪▫●○◆◇'
const unicodeChars = ['漢', '字', '語', '🙂', '🚀', '界', '火', '水', '🌊', '🌲']

function makeDenseFrame(frame, cols, rows) {
  let out = ''
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      out += denseChars[(x * 3 + y * 7 + frame) % denseChars.length]
    }
    if (y < rows - 1) out += '\n'
  }
  return out
}

function makeSparseFrame(frame, cols, rows) {
  const px = frame % cols
  const py = Math.floor(frame / cols) % rows

  let out = ''
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      out += x === px && y === py ? '@' : '.'
    }
    if (y < rows - 1) out += '\n'
  }
  return out
}

function makeUnicodeFrame(frame, cols, rows) {
  let out = ''
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      out += unicodeChars[(x * 5 + y * 11 + frame) % unicodeChars.length]
    }
    if (y < rows - 1) out += '\n'
  }
  return out
}

function makeFrame(frame, cols, rows, workload) {
  switch (workload) {
    case 'dense':
      return makeDenseFrame(frame, cols, rows)
    case 'sparse':
      return makeSparseFrame(frame, cols, rows)
    case 'unicode':
      return makeUnicodeFrame(frame, cols, rows)
    default:
      throw new Error(`Unsupported WORKLOAD: ${workload}. Expected dense|sparse|unicode`)
  }
}

const renderRecords = new Map()
let renderCount = 0
let currentWriteRender = -1

const fakeStdin = new PassThrough()
fakeStdin.isTTY = false
fakeStdin.setRawMode = () => {}

const stdout = new TimingTtyStream({
  columns: COLS,
  rows: ROWS,
  sink: SINK,
  onWrite: (ms, bytes) => {
    const idx = currentWriteRender
    if (!inWindow(idx)) return
    const rec = ensureRenderRecord(renderRecords, idx)
    rec.writeMs += ms
    rec.writeBytes += bytes
    rec.writeCalls += 1
  },
})

const originalCalculateLayout = Yoga.Node.prototype.calculateLayout
Yoga.Node.prototype.calculateLayout = function patchedCalculateLayout(...args) {
  const idx = renderCount
  const t0 = performance.now()
  const result = originalCalculateLayout.apply(this, args)
  const dt = performance.now() - t0

  if (inWindow(idx)) {
    const rec = ensureRenderRecord(renderRecords, idx)
    rec.layoutMs += dt
    rec.layoutCalls += 1
  }

  return result
}

const OUTPUT_SCRATCH = Symbol('ink-fast-output-scratch')
const BLANK_CELL = Object.freeze({
  type: 'char',
  value: ' ',
  fullWidth: false,
  styles: Object.freeze([]),
})

function getReusableOutputGrid(outputInstance) {
  const width = outputInstance.width
  const height = outputInstance.height
  let scratch = outputInstance[OUTPUT_SCRATCH]

  if (!scratch || scratch.width !== width || scratch.height !== height) {
    const rows = Array.from({ length: height }, () => Array(width).fill(BLANK_CELL))
    scratch = { width, height, rows }
    outputInstance[OUTPUT_SCRATCH] = scratch
    return rows
  }

  for (const row of scratch.rows) {
    row.length = width
    row.fill(BLANK_CELL)
  }

  return scratch.rows
}

function outputGetWithReusePatch() {
  const output = getReusableOutputGrid(this)
  const clips = []

  for (const operation of this.operations) {
    if (operation.type === 'clip') {
      clips.push(operation.clip)
      continue
    }

    if (operation.type === 'unclip') {
      clips.pop()
      continue
    }

    if (operation.type !== 'write') {
      continue
    }

    const { text, transformers } = operation
    let { x, y } = operation
    let lines = text.split('\n')
    const clip = clips.at(-1)

    if (clip) {
      const clipHorizontally = typeof clip?.x1 === 'number' && typeof clip?.x2 === 'number'
      const clipVertically = typeof clip?.y1 === 'number' && typeof clip?.y2 === 'number'

      if (clipHorizontally) {
        const width = this.caches.getWidestLine(text)
        if (x + width < clip.x1 || x > clip.x2) {
          continue
        }
      }

      if (clipVertically) {
        const height = lines.length
        if (y + height < clip.y1 || y > clip.y2) {
          continue
        }
      }

      if (clipHorizontally) {
        lines = lines.map((line) => {
          const from = x < clip.x1 ? clip.x1 - x : 0
          const width = this.caches.getStringWidth(line)
          const to = x + width > clip.x2 ? clip.x2 - x : width
          return sliceAnsi(line, from, to)
        })

        if (x < clip.x1) {
          x = clip.x1
        }
      }

      if (clipVertically) {
        const from = y < clip.y1 ? clip.y1 - y : 0
        const height = lines.length
        const to = y + height > clip.y2 ? clip.y2 - y : height
        lines = lines.slice(from, to)

        if (y < clip.y1) {
          y = clip.y1
        }
      }
    }

    let offsetY = 0

    for (const [lineIndex, originalLine] of lines.entries()) {
      const currentLine = output[y + offsetY]
      if (!currentLine) {
        offsetY += 1
        continue
      }

      let line = originalLine
      for (const transformer of transformers) {
        line = transformer(line, lineIndex)
      }

      const characters = this.caches.getStyledChars(line)
      let offsetX = x

      for (const character of characters) {
        const characterWidth = Math.max(1, this.caches.getStringWidth(character.value))

        if (offsetX < 0) {
          offsetX += characterWidth
          continue
        }

        if (offsetX >= currentLine.length) {
          break
        }

        currentLine[offsetX] = character

        if (characterWidth > 1) {
          for (let index = 1; index < characterWidth; index++) {
            if (offsetX + index >= currentLine.length) {
              break
            }

            currentLine[offsetX + index] = {
              type: 'char',
              value: '',
              fullWidth: false,
              styles: character.styles,
            }
          }
        }

        offsetX += characterWidth
      }

      offsetY += 1
    }
  }

  const generatedOutput = output.map((line) => styledCharsToString(line).trimEnd()).join('\n')
  return {
    output: generatedOutput,
    height: output.length,
  }
}

const originalOutputGet = Output.prototype.get
const selectedOutputGet = PATCH_OUTPUT_REUSE ? outputGetWithReusePatch : originalOutputGet

Output.prototype.get = function patchedOutputGet(...args) {
  const idx = renderCount
  const t0 = performance.now()
  const result = selectedOutputGet.apply(this, args)
  const dt = performance.now() - t0

  if (inWindow(idx)) {
    const rec = ensureRenderRecord(renderRecords, idx)
    rec.outputGetMs += dt
    rec.outputGetCalls += 1
  }

  return result
}

function Workload() {
  const { exit } = useApp()
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (frame >= TOTAL_UPDATES) {
      const timer = setTimeout(() => exit(), 0)
      return () => clearTimeout(timer)
    }

    const timer = setTimeout(() => setFrame((f) => f + 1), 0)
    return () => clearTimeout(timer)
  }, [frame, exit])

  const text = useMemo(() => makeFrame(frame, COLS, ROWS, WORKLOAD), [frame])

  return React.createElement(
    Box,
    { width: COLS, height: ROWS, flexDirection: 'column' },
    React.createElement(Text, null, text),
  )
}

let inkInstance = null

try {
  inkInstance = render(React.createElement(Workload), {
    stdout,
    stdin: fakeStdin,
    stderr: process.stderr,
    patchConsole: false,
    exitOnCtrlC: false,
    maxFps: MAX_FPS,
    concurrent: false,
    onRender: ({ renderTime }) => {
      const idx = renderCount
      currentWriteRender = idx

      if (inWindow(idx)) {
        const rec = ensureRenderRecord(renderRecords, idx)
        rec.renderTotalMs += renderTime
      }

      renderCount += 1
    },
  })

  await inkInstance.waitUntilExit()
} finally {
  Yoga.Node.prototype.calculateLayout = originalCalculateLayout
  Output.prototype.get = originalOutputGet
  stdout.closeSink()
}

const measured = [...renderRecords.entries()].sort((a, b) => a[0] - b[0]).map(([, rec]) => rec)

const layoutMs = measured.map((r) => r.layoutMs)
const outputGetMs = measured.map((r) => r.outputGetMs)
const renderTotalMs = measured.map((r) => r.renderTotalMs)
const writeMs = measured.map((r) => r.writeMs)
const writeBytes = measured.map((r) => r.writeBytes)
const writeCalls = measured.map((r) => r.writeCalls)
const treeEtcMs = measured.map((r) => Math.max(0, r.renderTotalMs - r.outputGetMs))

const rows = [
  ['layout (Yoga.calculateLayout)', summarize(layoutMs)],
  ['output assembly (Output.get)', summarize(outputGetMs)],
  ['render total (Ink onRender)', summarize(renderTotalMs)],
  ['est. tree/transform (render - output.get)', summarize(treeEtcMs)],
  ['stdout.write wall time', summarize(writeMs)],
  ['stdout bytes per render', summarize(writeBytes)],
  ['stdout writes per render', summarize(writeCalls)],
]

console.log('\n╔════════════════════════════════════════════════════════════════════╗')
console.log('║                 ink stage profiler (phase 0)                     ║')
console.log('╚════════════════════════════════════════════════════════════════════╝')
console.log('')
console.log(
  `cols=${COLS} rows=${ROWS} warmup=${WARMUP_RENDERS} measured=${MEASURE_RENDERS} maxFps=${MAX_FPS} sink=${SINK} workload=${WORKLOAD} outputReusePatch=${PATCH_OUTPUT_REUSE}`,
)
console.log(`renders observed=${renderCount} measured rows=${measured.length}`)
console.log('')

console.table(
  rows.map(([stage, stats]) => ({
    stage,
    n: stats.n,
    'mean (ms)': fmt(stats.mean),
    'median (ms)': fmt(stats.median),
    'p95 (ms)': fmt(stats.p95),
    'min (ms)': fmt(stats.min),
    'max (ms)': fmt(stats.max),
  })),
)

if (OUTPUT_JSON) {
  const payload = {
    config: {
      cols: COLS,
      rows: ROWS,
      warmupRenders: WARMUP_RENDERS,
      measureRenders: MEASURE_RENDERS,
      maxFps: MAX_FPS,
      sink: SINK,
      workload: WORKLOAD,
      patchOutputReuse: PATCH_OUTPUT_REUSE,
      rendersObserved: renderCount,
      measuredRenders: measured.length,
    },
    summary: Object.fromEntries(rows.map(([stage, stats]) => [stage, stats])),
    perRender: measured,
  }

  const outPath = path.resolve(process.cwd(), OUTPUT_JSON)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n')
  console.log(`\nWrote ${OUTPUT_JSON}`)
}

console.log('')
