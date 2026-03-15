/**
 * benchmark/startup/bench-startup.mjs
 *
 * Startup benchmark: ratatat vs ink.
 *
 * Metric: time-to-marker (ms)
 *   process start -> marker text first appears in PTY output.
 *
 * Includes:
 *   - Node process startup
 *   - module loading
 *   - framework initialization
 *   - first render path
 *
 * Run:
 *   npm run build:ts
 *   npm run bench:startup
 *
 * Optional:
 *   RUNS=40 WARMUP=3 npm run bench:startup
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..', '..')

const RUNS = Number(process.env.RUNS ?? 30)
const WARMUP = Number(process.env.WARMUP ?? 3)
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 5000)

if (!existsSync(resolve(ROOT, 'dist/react-entry.js'))) {
  console.error('Missing dist/react-entry.js. Run: npm run build:ts')
  process.exit(1)
}

const SCRIPT_PREFIX = Buffer.from('^D\b\b')

const suites = [
  {
    name: 'node baseline',
    marker: 'NODE_STARTUP_READY',
    command: ['node', resolve(__dirname, 'node-startup.mjs')],
  },
  {
    name: 'ratatat (react mode)',
    marker: 'RATATAT_STARTUP_READY',
    command: ['node', resolve(__dirname, 'ratatat-startup.mjs')],
  },
  {
    name: 'ink',
    marker: 'INK_STARTUP_READY',
    command: ['node', resolve(__dirname, 'ink-startup.mjs')],
  },
]

function quoteForShell(arg) {
  if (/^[a-zA-Z0-9_./:-]+$/.test(arg)) return arg
  return `'${arg.replace(/'/g, `'"'"'`)}'`
}

function buildScriptArgs(command) {
  if (process.platform === 'darwin' || process.platform === 'freebsd') {
    // BSD script: script [-q] file command ...
    return ['-q', '/dev/null', ...command]
  }

  // util-linux script: script -q /dev/null -c "command ..."
  const cmd = command.map(quoteForShell).join(' ')
  return ['-q', '/dev/null', '-c', cmd]
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]
}

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / sorted.length
  const stdev = Math.sqrt(variance)

  return {
    runs: sorted.length,
    min: sorted[0] ?? 0,
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    mean,
    stdev,
    max: sorted[sorted.length - 1] ?? 0,
  }
}

function fmtMs(n) {
  return `${n.toFixed(2)} ms`
}

function runOnce(suite) {
  return new Promise((resolvePromise, rejectPromise) => {
    const args = buildScriptArgs(suite.command)
    const startedAt = performance.now()

    let prefixMatched = 0
    let firstOutputMs = null
    let markerMs = null
    let sliding = ''
    let normalizedSliding = ''
    let debugOut = ''

    const child = spawn('script', args, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    })

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      rejectPromise(
        new Error(
          `[${suite.name}] timed out after ${TIMEOUT_MS}ms\n` +
            `command: script ${args.join(' ')}\n` +
            `captured: ${JSON.stringify(debugOut.slice(-500))}`,
        ),
      )
    }, TIMEOUT_MS)

    const onData = (chunk) => {
      const now = performance.now()
      let i = 0

      // Strip BSD script preamble (^D\b\b) if present.
      while (i < chunk.length && prefixMatched < SCRIPT_PREFIX.length && chunk[i] === SCRIPT_PREFIX[prefixMatched]) {
        i++
        prefixMatched++
      }

      // If the stream doesn't match the preamble, stop trying to strip it.
      if (prefixMatched < SCRIPT_PREFIX.length && i < chunk.length) {
        prefixMatched = SCRIPT_PREFIX.length
        i = 0
      }

      const payload = chunk.subarray(i)
      if (payload.length === 0) return

      if (firstOutputMs === null) {
        firstOutputMs = now - startedAt
      }

      const text = payload.toString('utf8')
      debugOut += text
      if (debugOut.length > 4000) debugOut = debugOut.slice(-4000)

      if (markerMs === null) {
        sliding = (sliding + text).slice(-suite.marker.length * 4)
        const normalized = text.toUpperCase().replace(/[^A-Z0-9_]/g, '')
        normalizedSliding = (normalizedSliding + normalized).slice(-suite.marker.length * 6)

        if (sliding.includes(suite.marker) || normalizedSliding.includes(suite.marker)) {
          markerMs = now - startedAt
        }
      }
    }

    child.stdout.on('data', onData)
    child.stderr.on('data', onData)

    child.on('error', (err) => {
      clearTimeout(timer)
      rejectPromise(err)
    })

    child.on('close', (code, signal) => {
      clearTimeout(timer)

      if (code !== 0) {
        rejectPromise(
          new Error(
            `[${suite.name}] exited with code=${code} signal=${signal ?? 'none'}\n` +
              `command: script ${args.join(' ')}\n` +
              `captured: ${JSON.stringify(debugOut.slice(-500))}`,
          ),
        )
        return
      }

      if (markerMs === null) {
        rejectPromise(
          new Error(
            `[${suite.name}] marker not observed: ${suite.marker}\n` +
              `firstOutput=${firstOutputMs === null ? 'none' : fmtMs(firstOutputMs)}\n` +
              `captured: ${JSON.stringify(debugOut.slice(-500))}`,
          ),
        )
        return
      }

      resolvePromise({
        markerMs,
        firstOutputMs,
      })
    })
  })
}

const samples = new Map(suites.map((s) => [s.name, []]))

console.log('\n╔════════════════════════════════════════════════════════════════════╗')
console.log('║              startup benchmark — ratatat vs ink                  ║')
console.log('╚════════════════════════════════════════════════════════════════════╝')
console.log(`\nruns=${RUNS}, warmup=${WARMUP}, timeout=${TIMEOUT_MS}ms`)
console.log('metric: time-to-marker (first visible marker text in PTY output)\n')

for (let i = 0; i < WARMUP; i++) {
  for (const suite of suites) {
    await runOnce(suite)
  }
}

for (let i = 0; i < RUNS; i++) {
  for (const suite of suites) {
    const r = await runOnce(suite)
    samples.get(suite.name).push(r.markerMs)
  }

  if ((i + 1) % 5 === 0 || i + 1 === RUNS) {
    process.stdout.write(`  completed ${i + 1}/${RUNS} rounds\r`)
  }
}
process.stdout.write('\n')

const stats = new Map()
for (const suite of suites) {
  stats.set(suite.name, summarize(samples.get(suite.name)))
}

const baselineMedian = stats.get('node baseline').median
const inkMedian = stats.get('ink').median
const ratatatMedian = stats.get('ratatat (react mode)').median

const table = suites.map((suite) => {
  const s = stats.get(suite.name)
  const overhead = s.median - baselineMedian

  return {
    suite: suite.name,
    runs: s.runs,
    'median (ms)': s.median.toFixed(2),
    'p95 (ms)': s.p95.toFixed(2),
    'mean (ms)': s.mean.toFixed(2),
    'stdev (ms)': s.stdev.toFixed(2),
    'min (ms)': s.min.toFixed(2),
    'max (ms)': s.max.toFixed(2),
    'over baseline (ms)': overhead.toFixed(2),
  }
})

console.log('')
console.table(table)

if (ratatatMedian > 0 && inkMedian > 0) {
  const speedup = inkMedian / ratatatMedian
  const delta = inkMedian - ratatatMedian
  console.log(`Ratatat median startup: ${fmtMs(ratatatMedian)}`)
  console.log(`Ink median startup:     ${fmtMs(inkMedian)}`)
  console.log(`Delta:                  ${fmtMs(delta)} (${speedup.toFixed(2)}x)`)
}

console.log('')
