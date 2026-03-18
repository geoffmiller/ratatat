/**
 * ratatat benchmark
 *
 * Run: node --import @oxc-node/core/register benchmark/bench.ts
 */

import { Bench } from 'tinybench'
import React from 'react'

import { Renderer } from '@ratatat/core'
import { LayoutNode } from '@ratatat/react/layout'
import { RatatatReconciler } from '@ratatat/react/reconciler'
import { renderTreeToBuffer } from '@ratatat/react/renderer'

const COLS = 80
const ROWS = 24
const CELLS = COLS * ROWS

// ─── Trees ────────────────────────────────────────────────────────────────────

function simpleTree(n: number) {
  return React.createElement(
    'box',
    { flexDirection: 'column', padding: 1 },
    React.createElement('text', { color: 'green', bold: true }, 'Hello World'),
    React.createElement('text', {}, `Counter: ${n}`),
  )
}

function complexTree(n: number) {
  return React.createElement(
    'box',
    { flexDirection: 'column', width: COLS, height: ROWS },
    React.createElement(
      'box',
      { borderStyle: 'round', borderColor: 'green', padding: 1, marginBottom: 1 },
      React.createElement('text', { bold: true, color: 'cyan' }, 'ratatat benchmark'),
      React.createElement('text', { color: 'white' }, `Frame: ${n}`),
    ),
    React.createElement(
      'box',
      { flexDirection: 'row', gap: 2 },
      React.createElement(
        'box',
        { borderStyle: 'single', width: 20 },
        React.createElement('text', { color: 'yellow' }, 'Panel A'),
        React.createElement('text', {}, `val: ${n % 100}`),
      ),
      React.createElement(
        'box',
        { borderStyle: 'single', width: 20 },
        React.createElement('text', { color: 'magenta' }, 'Panel B'),
        React.createElement('text', {}, `val: ${(n * 7) % 100}`),
      ),
      React.createElement(
        'box',
        { borderStyle: 'single', width: 20 },
        React.createElement('text', { color: 'blue' }, 'Panel C'),
        React.createElement('text', {}, `val: ${(n * 13) % 100}`),
      ),
    ),
    React.createElement('box', { marginTop: 1 }, React.createElement('text', { dim: true }, 'Press Ctrl+C to exit')),
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeContainer() {
  const root = new LayoutNode()
  const container = (RatatatReconciler as any).createContainer(root, 0, null, false, null, '', () => {}, null)
  return { root, container, buffer: new Uint32Array(CELLS * 2) }
}

function doRender(ctx: ReturnType<typeof makeContainer>, element: React.ReactElement) {
  RatatatReconciler.updateContainer(element, ctx.container, null, () => {})
  ctx.root.calculateLayout(COLS, ROWS)
  renderTreeToBuffer(ctx.root, ctx.buffer, COLS, ROWS)
}

// ─── Manual bench for React tasks (tinybench + React scheduler = deadlock) ──

function manualBench(name: string, fn: () => void, durationMs = 2000) {
  // Warmup
  for (let i = 0; i < 50; i++) fn()

  const times: number[] = []
  const deadline = performance.now() + durationMs
  while (performance.now() < deadline) {
    const t0 = performance.now()
    fn()
    times.push(performance.now() - t0)
  }
  times.sort((a, b) => a - b)
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const p99 = times[Math.floor(times.length * 0.99)]!
  return {
    name,
    'ops/sec': Math.round(1000 / avg).toLocaleString(),
    'avg (µs)': (avg * 1000).toFixed(1),
    'p99 (µs)': (p99 * 1000).toFixed(1),
    samples: times.length,
  }
}

// ─── Diff engine buffers ──────────────────────────────────────────────────────
const emptyBuffer = new Uint32Array(CELLS * 2)

const fullBuffer = new Uint32Array(CELLS * 2)
for (let i = 0; i < CELLS; i++) {
  fullBuffer[i * 2] = 65 + (i % 26)
  fullBuffer[i * 2 + 1] = (1 << 16) | (2 << 8) | 15
}

const partialBuffer = new Uint32Array(fullBuffer)
for (let i = 0; i < CELLS * 0.05; i++) {
  const cell = (i * 37) % CELLS
  partialBuffer[cell * 2] = 66 + (i % 26)
}

// ─── Run ──────────────────────────────────────────────────────────────────────

const results: any[] = []

// React pipeline (manual bench to avoid tinybench + React scheduler deadlock)
// Mount benchmarks reuse a single container to avoid Yoga WASM heap exhaustion.
// This measures reconciler + layout + paint, not container creation.
const mountCtx = makeContainer()
results.push(
  manualBench('mount + render (simple)', () => {
    doRender(mountCtx, simpleTree(0))
  }),
)

results.push(
  manualBench('mount + render (complex)', () => {
    doRender(mountCtx, complexTree(0))
  }),
)

let frameN = 0
const simpleCtx = makeContainer()
doRender(simpleCtx, simpleTree(0))
results.push(
  manualBench('rerender (simple, state change)', () => {
    doRender(simpleCtx, simpleTree(++frameN))
  }),
)

const complexCtx = makeContainer()
doRender(complexCtx, complexTree(0))
results.push(
  manualBench('rerender (complex, state change)', () => {
    doRender(complexCtx, complexTree(++frameN))
  }),
)

// Diff engine (tinybench is fine here — no React involved)
const diffBench = new Bench({ time: 2000, warmupTime: 500 })

diffBench.add('diff: no changes (hot path)', () => {
  const r = new Renderer(COLS, ROWS)
  r.renderDiff(emptyBuffer)
  r.renderDiff(emptyBuffer)
})

diffBench.add('diff: all cells dirty (first frame)', () => {
  const r = new Renderer(COLS, ROWS)
  r.renderDiff(fullBuffer)
})

diffBench.add('diff: 5% cells dirty (typical frame)', () => {
  const r = new Renderer(COLS, ROWS)
  r.renderDiff(fullBuffer)
  r.renderDiff(partialBuffer)
})

await diffBench.run()
for (const t of diffBench.tasks) {
  const r = t.result as any
  results.push({
    name: t.name,
    'ops/sec': r?.throughput?.mean ? Math.round(r.throughput.mean).toLocaleString() : '-',
    'avg (µs)': r?.latency?.mean ? (r.latency.mean * 1000).toFixed(1) : '-',
    'p99 (µs)': r?.latency?.p99 ? (r.latency.p99 * 1000).toFixed(1) : '-',
    samples: r?.latency?.samplesCount ?? 0,
  })
}

// ─── Output ───────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════════════════════╗')
console.log('║                    ratatat — render benchmark                   ║')
console.log('╚══════════════════════════════════════════════════════════════════╝\n')
console.table(results)
console.log('')
process.exit(0)
