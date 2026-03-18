/**
 * ink-fast/prototypes/ink-cpu-hotspots.mjs
 *
 * CPU-sampling hotspot profiler for Ink workload rendering.
 *
 * Uses Node's inspector Profiler to capture CPU samples while an Ink workload runs,
 * then prints top self-time hotspots by function and by file.
 *
 * Run:
 *   node ink-fast/prototypes/ink-cpu-hotspots.mjs
 *
 * Optional env:
 *   COLS=80 ROWS=24
 *   WARMUP_RENDERS=20
 *   MEASURE_RENDERS=120
 *   WORKLOAD=dense|sparse|unicode
 *   MAX_FPS=1000
 *   TOP_N=20
 *   OUTPUT_JSON=ink-fast/results/ink-cpu-hotspots.json
 *   PATCH_SHARED_OUTPUT_CACHES=0|1
 *   INCLUDE_RAW_PROFILE=0|1
 */

import fs from 'node:fs'
import path from 'node:path'
import inspector from 'node:inspector'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Writable, PassThrough } from 'node:stream'
import React, { useEffect, useMemo, useState } from 'react'
import { render, Box, Text, useApp } from 'ink'

const COLS = Number(process.env.COLS ?? 80)
const ROWS = Number(process.env.ROWS ?? 24)
const WARMUP_RENDERS = Number(process.env.WARMUP_RENDERS ?? 20)
const MEASURE_RENDERS = Number(process.env.MEASURE_RENDERS ?? 120)
const MAX_FPS = Number(process.env.MAX_FPS ?? 1000)
const WORKLOAD = process.env.WORKLOAD ?? 'dense'
const TOP_N = Number(process.env.TOP_N ?? 20)
const OUTPUT_JSON = process.env.OUTPUT_JSON
const PATCH_SHARED_OUTPUT_CACHES = process.env.PATCH_SHARED_OUTPUT_CACHES === '1'
const INCLUDE_RAW_PROFILE = process.env.INCLUDE_RAW_PROFILE === '1'

const TOTAL_UPDATES = WARMUP_RENDERS + MEASURE_RENDERS

const require = createRequire(import.meta.url)
const inkEntryPath = require.resolve('ink')
const inkPackageDir = path.resolve(path.dirname(inkEntryPath), '..')
const outputPath = path.join(inkPackageDir, 'build', 'output.js')
const { default: Output } = await import(pathToFileURL(outputPath).href)

const originalOutputGet = Output.prototype.get
let sharedOutputCaches = null

if (PATCH_SHARED_OUTPUT_CACHES) {
  Output.prototype.get = function patchedCpuOutputGet(...args) {
    if (sharedOutputCaches === null) {
      sharedOutputCaches = this.caches
    } else {
      this.caches = sharedOutputCaches
    }

    return originalOutputGet.apply(this, args)
  }
}

class DevNullTtyStream extends Writable {
  constructor({ columns, rows }) {
    super()
    this.isTTY = true
    this.columns = columns
    this.rows = rows
    this.fd = 1
    this._fd = fs.openSync('/dev/null', 'w')
  }

  _write(chunk, encoding, callback) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding)
    fs.writeSync(this._fd, data)
    callback()
  }

  closeSink() {
    if (this._fd !== null) {
      fs.closeSync(this._fd)
      this._fd = null
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

function inspectorPost(session, method, params = {}) {
  return new Promise((resolve, reject) => {
    session.post(method, params, (error, result) => {
      if (error) {
        reject(error)
        return
      }
      resolve(result)
    })
  })
}

function normalizeUrl(url) {
  if (!url) return '(native)'

  if (url.startsWith('file://')) {
    url = fileURLToPath(url)
  }

  if (url.startsWith('node:')) {
    return url
  }

  const cwd = process.cwd()
  if (url.startsWith(cwd + path.sep)) {
    return path.relative(cwd, url)
  }

  const nodeModulesIndex = url.lastIndexOf('/node_modules/')
  if (nodeModulesIndex >= 0) {
    return url.slice(nodeModulesIndex + 1)
  }

  return url
}

function aggregateHotspots(profile) {
  const nodes = profile.nodes ?? []
  const totalHits = nodes.reduce((sum, node) => sum + (node.hitCount ?? 0), 0)
  const durationMs = ((profile.endTime ?? 0) - (profile.startTime ?? 0)) / 1000
  const sampleMs = totalHits > 0 ? durationMs / totalHits : 0

  const byFunction = new Map()
  const byFile = new Map()

  for (const node of nodes) {
    const hitCount = node.hitCount ?? 0
    if (hitCount === 0) continue

    const fn = node.callFrame?.functionName || '(anonymous)'
    const url = normalizeUrl(node.callFrame?.url || '')
    const line = (node.callFrame?.lineNumber ?? 0) + 1

    const functionKey = `${url}:${line} ${fn}`
    const functionEntry = byFunction.get(functionKey) ?? {
      function: fn,
      file: url,
      line,
      hits: 0,
    }
    functionEntry.hits += hitCount
    byFunction.set(functionKey, functionEntry)

    const fileEntry = byFile.get(url) ?? { file: url, hits: 0 }
    fileEntry.hits += hitCount
    byFile.set(url, fileEntry)
  }

  const functionRows = [...byFunction.values()]
    .sort((a, b) => b.hits - a.hits)
    .map((row) => ({
      ...row,
      selfMs: row.hits * sampleMs,
      selfPct: totalHits > 0 ? row.hits / totalHits : 0,
    }))

  const fileRows = [...byFile.values()]
    .sort((a, b) => b.hits - a.hits)
    .map((row) => ({
      ...row,
      selfMs: row.hits * sampleMs,
      selfPct: totalHits > 0 ? row.hits / totalHits : 0,
    }))

  return {
    totalHits,
    durationMs,
    sampleMs,
    topFunctions: functionRows,
    topFiles: fileRows,
  }
}

function fmtMs(value) {
  return value.toFixed(3)
}

function fmtPct(value) {
  return `${(value * 100).toFixed(1)}%`
}

const stdout = new DevNullTtyStream({ columns: COLS, rows: ROWS })
const fakeStdin = new PassThrough()
fakeStdin.isTTY = false
fakeStdin.setRawMode = () => {}

const session = new inspector.Session()
session.connect()

let renderCount = 0
let profilerStarted = false
let profilerStartPromise = null

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
  await inspectorPost(session, 'Profiler.enable')

  inkInstance = render(React.createElement(Workload), {
    stdout,
    stdin: fakeStdin,
    stderr: process.stderr,
    patchConsole: false,
    exitOnCtrlC: false,
    maxFps: MAX_FPS,
    concurrent: false,
    onRender: () => {
      if (!profilerStarted && renderCount >= WARMUP_RENDERS) {
        profilerStarted = true
        profilerStartPromise = inspectorPost(session, 'Profiler.start')
      }

      renderCount += 1
    },
  })

  await inkInstance.waitUntilExit()

  if (profilerStartPromise) {
    await profilerStartPromise
  } else {
    await inspectorPost(session, 'Profiler.start')
  }

  const stopResult = await inspectorPost(session, 'Profiler.stop')
  const profile = stopResult.profile

  const hotspots = aggregateHotspots(profile)

  console.log('\n╔════════════════════════════════════════════════════════════════════╗')
  console.log('║                ink cpu hotspots (phase 0.5)                      ║')
  console.log('╚════════════════════════════════════════════════════════════════════╝')
  console.log('')
  console.log(
    `workload=${WORKLOAD} cols=${COLS} rows=${ROWS} warmup=${WARMUP_RENDERS} measured=${MEASURE_RENDERS} rendersObserved=${renderCount} sharedOutputCaches=${PATCH_SHARED_OUTPUT_CACHES}`,
  )
  console.log(
    `duration=${fmtMs(hotspots.durationMs)}ms totalSamples=${hotspots.totalHits} sample≈${fmtMs(hotspots.sampleMs)}ms`,
  )

  const topFunctions = hotspots.topFunctions.slice(0, TOP_N)
  const topFiles = hotspots.topFiles.slice(0, TOP_N)

  console.log('')
  console.log(`Top functions by self samples (top ${TOP_N})`)
  console.table(
    topFunctions.map((row) => ({
      function: row.function,
      file: row.file,
      line: row.line,
      hits: row.hits,
      'self ms': fmtMs(row.selfMs),
      'self %': fmtPct(row.selfPct),
    })),
  )

  console.log('')
  console.log(`Top files by self samples (top ${TOP_N})`)
  console.table(
    topFiles.map((row) => ({
      file: row.file,
      hits: row.hits,
      'self ms': fmtMs(row.selfMs),
      'self %': fmtPct(row.selfPct),
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
        workload: WORKLOAD,
        patchSharedOutputCaches: PATCH_SHARED_OUTPUT_CACHES,
        rendersObserved: renderCount,
        topN: TOP_N,
        includeRawProfile: INCLUDE_RAW_PROFILE,
      },
      summary: {
        durationMs: hotspots.durationMs,
        totalSamples: hotspots.totalHits,
        sampleMs: hotspots.sampleMs,
      },
      topFunctions: hotspots.topFunctions,
      topFiles: hotspots.topFiles,
      ...(INCLUDE_RAW_PROFILE ? { rawProfile: profile } : {}),
    }

    const outPath = path.resolve(process.cwd(), OUTPUT_JSON)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n')
    console.log(`\nWrote ${OUTPUT_JSON}`)
  }

  console.log('')
} finally {
  Output.prototype.get = originalOutputGet
  session.disconnect()
  stdout.closeSink()
}
