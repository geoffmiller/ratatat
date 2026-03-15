/**
 * ink-fast/prototypes/ink-stage-matrix.mjs
 *
 * Runs ink-stage-profiler across multiple workloads and prints a compact matrix.
 *
 * Run:
 *   node ink-fast/prototypes/ink-stage-matrix.mjs
 *
 * Optional env:
 *   WORKLOADS=dense,sparse,unicode
 *   VARIANTS=stock,reuse
 *   WARMUP_RENDERS=5 MEASURE_RENDERS=20 MAX_FPS=1000 SINK=devnull
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const WORKLOADS = (process.env.WORKLOADS ?? 'dense,sparse,unicode')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean)

const VARIANTS = (process.env.VARIANTS ?? 'stock,reuse')
  .split(',')
  .map((x) => x.trim())
  .filter((x) => x === 'stock' || x === 'reuse')

if (VARIANTS.length === 0) {
  throw new Error('No valid variants selected. Use VARIANTS=stock,reuse')
}

const BASE_ENV = {
  COLS: process.env.COLS ?? '80',
  ROWS: process.env.ROWS ?? '24',
  WARMUP_RENDERS: process.env.WARMUP_RENDERS ?? '5',
  MEASURE_RENDERS: process.env.MEASURE_RENDERS ?? '20',
  MAX_FPS: process.env.MAX_FPS ?? '1000',
  SINK: process.env.SINK ?? 'devnull',
}

function runProfiler(workload, variant, outputPath) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn('node', ['ink-fast/prototypes/ink-stage-profiler.mjs'], {
      cwd: ROOT,
      env: {
        ...process.env,
        ...BASE_ENV,
        WORKLOAD: workload,
        PATCH_OUTPUT_REUSE: variant === 'reuse' ? '1' : '0',
        OUTPUT_JSON: outputPath,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let out = ''
    let err = ''

    child.stdout.on('data', (chunk) => {
      out += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk) => {
      err += chunk.toString('utf8')
    })

    child.on('error', rejectPromise)
    child.on('close', (code) => {
      if (code !== 0) {
        rejectPromise(
          new Error(`Profiler failed for ${workload}/${variant} (code ${code})\nstdout:\n${out}\nstderr:\n${err}`),
        )
        return
      }

      resolvePromise({ out, err })
    })
  })
}

function getStage(summary, key) {
  return summary[key] ?? { mean: 0, median: 0, p95: 0 }
}

function fmt(n) {
  return Number(n).toFixed(3)
}

console.log('\nRunning Ink stage profiler matrix...')
console.log(
  `workloads=${WORKLOADS.join(',')} variants=${VARIANTS.join(',')} cols=${BASE_ENV.COLS} rows=${BASE_ENV.ROWS} warmup=${BASE_ENV.WARMUP_RENDERS} measured=${BASE_ENV.MEASURE_RENDERS} sink=${BASE_ENV.SINK}`,
)

const results = []

for (const workload of WORKLOADS) {
  for (const variant of VARIANTS) {
    const outputPath = path.join(os.tmpdir(), `ink-stage-profile-${workload}-${variant}-${Date.now()}.json`)
    await runProfiler(workload, variant, outputPath)

    const payload = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    fs.unlinkSync(outputPath)

    const summary = payload.summary
    const layout = getStage(summary, 'layout (Yoga.calculateLayout)')
    const outputGet = getStage(summary, 'output assembly (Output.get)')
    const renderTotal = getStage(summary, 'render total (Ink onRender)')
    const tree = getStage(summary, 'est. tree/transform (render - output.get)')
    const write = getStage(summary, 'stdout.write wall time')
    const bytes = getStage(summary, 'stdout bytes per render')

    results.push({
      workload,
      variant,
      'render median (ms)': fmt(renderTotal.median),
      'tree median (ms)': fmt(tree.median),
      'output.get median (ms)': fmt(outputGet.median),
      'layout median (ms)': fmt(layout.median),
      'write median (ms)': fmt(write.median),
      'bytes/render': fmt(bytes.median),
    })
  }
}

console.log('')
console.table(results)
console.log('')
