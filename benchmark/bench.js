/**
 * ratatat vs Ink benchmark
 *
 * Compares render throughput and initial mount time for equivalent React trees.
 *
 * ratatat path: reconciler → Yoga layout → Uint32Array buffer paint
 * Ink path:     reconciler → Yoga layout → string Output → chalk colorize
 *
 * Both use the same React reconciler machinery and Yoga layout engine.
 * The difference is purely in the render/paint layer.
 *
 * Run: node benchmark/bench.js
 */
import { Bench } from 'tinybench';
import React from 'react';
// ─── ratatat imports ──────────────────────────────────────────────────────────
import { LayoutNode } from '../dist/layout.js';
import { RatatatReconciler } from '../dist/reconciler.js';
import { renderTreeToBuffer } from '../dist/renderer.js';
import { Renderer } from '../dist/index.js';
// ─── Ink imports ──────────────────────────────────────────────────────────────
import { renderToString, Text as InkText, Box as InkBox } from '../../ink/build/index.js';
// ─── Shared config ────────────────────────────────────────────────────────────
const COLS = 80;
const ROWS = 24;
const CELLS = COLS * ROWS;
// ─── Suppress stdout during diff engine benchmarks ───────────────────────────
// The Renderer native module writes ANSI escape codes to stdout.
// We silence it during benchmarks to keep terminal clean.
const noop = () => true;
function suppressStdout() { process.stdout.write = noop; }
function restoreStdout() { delete process.stdout.write; }
// ─── Test trees ───────────────────────────────────────────────────────────────
/** Simple: a counter display with one colored text node */
function simpleTree(n) {
    return React.createElement('box', { flexDirection: 'column', padding: 1 }, React.createElement('text', { color: 'green', bold: true }, 'Hello World'), React.createElement('text', {}, `Counter: ${n}`));
}
function simpleInkTree(n) {
    return React.createElement(InkBox, { flexDirection: 'column', padding: 1 }, React.createElement(InkText, { color: 'green', bold: true }, 'Hello World'), React.createElement(InkText, {}, `Counter: ${n}`));
}
/** Complex: nested boxes, borders, multiple colors — closer to real app */
function complexTree(n) {
    return React.createElement('box', { flexDirection: 'column', width: COLS, height: ROWS }, React.createElement('box', { borderStyle: 'round', borderColor: 'green', padding: 1, marginBottom: 1 }, React.createElement('text', { bold: true, color: 'cyan' }, 'ratatat benchmark'), React.createElement('text', { color: 'white' }, `Frame: ${n}`)), React.createElement('box', { flexDirection: 'row', gap: 2 }, React.createElement('box', { borderStyle: 'single', width: 20 }, React.createElement('text', { color: 'yellow' }, 'Panel A'), React.createElement('text', {}, `val: ${n % 100}`)), React.createElement('box', { borderStyle: 'single', width: 20 }, React.createElement('text', { color: 'magenta' }, 'Panel B'), React.createElement('text', {}, `val: ${(n * 7) % 100}`)), React.createElement('box', { borderStyle: 'single', width: 20 }, React.createElement('text', { color: 'blue' }, 'Panel C'), React.createElement('text', {}, `val: ${(n * 13) % 100}`))), React.createElement('box', { marginTop: 1 }, React.createElement('text', { dim: true }, 'Press Ctrl+C to exit')));
}
function complexInkTree(n) {
    return React.createElement(InkBox, { flexDirection: 'column', width: COLS, height: ROWS }, React.createElement(InkBox, { borderStyle: 'round', borderColor: 'green', padding: 1, marginBottom: 1 }, React.createElement(InkText, { bold: true, color: 'cyan' }, 'ratatat benchmark'), React.createElement(InkText, { color: 'white' }, `Frame: ${n}`)), React.createElement(InkBox, { flexDirection: 'row' }, React.createElement(InkBox, { borderStyle: 'single', width: 20 }, React.createElement(InkText, { color: 'yellow' }, 'Panel A'), React.createElement(InkText, {}, `val: ${n % 100}`)), React.createElement(InkBox, { borderStyle: 'single', width: 20 }, React.createElement(InkText, { color: 'magenta' }, 'Panel B'), React.createElement(InkText, {}, `val: ${(n * 7) % 100}`)), React.createElement(InkBox, { borderStyle: 'single', width: 20 }, React.createElement(InkText, { color: 'blue' }, 'Panel C'), React.createElement(InkText, {}, `val: ${(n * 13) % 100}`))), React.createElement(InkBox, { marginTop: 1 }, React.createElement(InkText, { dimColor: true }, 'Press Ctrl+C to exit')));
}
// ─── ratatat headless render helper ──────────────────────────────────────────
function makeRatatatContainer() {
    const root = new LayoutNode();
    const container = RatatatReconciler.createContainer(root, 0, null, false, null, '', () => { }, null);
    const buffer = new Uint32Array(CELLS * 2);
    return { root, container, buffer };
}
function ratatatRender(root, container, buffer, element) {
    RatatatReconciler.updateContainer(element, container, null, () => { });
    root.calculateLayout(COLS, ROWS);
    renderTreeToBuffer(root, buffer, COLS, ROWS);
}
// ─── Pre-warmed containers for rerender benchmarks ───────────────────────────
const simpleCtx = makeRatatatContainer();
ratatatRender(simpleCtx.root, simpleCtx.container, simpleCtx.buffer, simpleTree(0));
const complexCtx = makeRatatatContainer();
ratatatRender(complexCtx.root, complexCtx.container, complexCtx.buffer, complexTree(0));
// ─── Diff engine buffers ──────────────────────────────────────────────────────
const emptyBuffer = new Uint32Array(CELLS * 2);
const fullBuffer = new Uint32Array(CELLS * 2);
for (let i = 0; i < CELLS; i++) {
    fullBuffer[i * 2] = 65 + (i % 26);
    fullBuffer[i * 2 + 1] = (1 << 16) | (2 << 8) | 15;
}
const partialBuffer = new Uint32Array(fullBuffer);
for (let i = 0; i < CELLS * 0.05; i++) {
    const cell = (i * 37) % CELLS; // deterministic, not random (avoids noise)
    partialBuffer[cell * 2] = 66 + (i % 26);
}
// ─── Benches ─────────────────────────────────────────────────────────────────
let frameN = 0;
const b = new Bench({ time: 1000, warmupTime: 200 });
// Suite 1: initial mount (cold container each time)
b.add('ratatat · initial mount (simple)', () => {
    const { root, container, buffer } = makeRatatatContainer();
    ratatatRender(root, container, buffer, simpleTree(0));
});
b.add('ink     · initial mount (simple)', () => {
    renderToString(simpleInkTree(0), { columns: COLS });
});
b.add('ratatat · initial mount (complex)', () => {
    const { root, container, buffer } = makeRatatatContainer();
    ratatatRender(root, container, buffer, complexTree(0));
});
b.add('ink     · initial mount (complex)', () => {
    renderToString(complexInkTree(0), { columns: COLS });
});
// Suite 2: rerender throughput (warm container, state change each frame)
b.add('ratatat · rerender (simple, state changes)', () => {
    frameN++;
    ratatatRender(simpleCtx.root, simpleCtx.container, simpleCtx.buffer, simpleTree(frameN));
});
b.add('ink     · rerender (simple, state changes)', () => {
    frameN++;
    renderToString(simpleInkTree(frameN), { columns: COLS });
});
b.add('ratatat · rerender (complex, state changes)', () => {
    frameN++;
    ratatatRender(complexCtx.root, complexCtx.container, complexCtx.buffer, complexTree(frameN));
});
b.add('ink     · rerender (complex, state changes)', () => {
    frameN++;
    renderToString(complexInkTree(frameN), { columns: COLS });
});
// Suite 3: diff engine (ratatat only — Ink doesn't expose this layer)
// Suppress stdout so Renderer's ANSI output doesn't pollute terminal during bench
b.add('ratatat · diff engine: nothing changed (hot path)', () => {
    suppressStdout();
    const r = new Renderer(COLS, ROWS);
    r.render(emptyBuffer);
    r.render(emptyBuffer);
    restoreStdout();
});
b.add('ratatat · diff engine: all cells dirty (cold/max-diff)', () => {
    suppressStdout();
    const r = new Renderer(COLS, ROWS);
    r.render(fullBuffer);
    restoreStdout();
});
b.add('ratatat · diff engine: 5% cells dirty (typical frame)', () => {
    suppressStdout();
    const r = new Renderer(COLS, ROWS);
    r.render(fullBuffer); // prime front-buffer
    r.render(partialBuffer); // 5% change
    restoreStdout();
});
await b.run();
// ─── Output ───────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║              ratatat vs Ink — render benchmark                  ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');
const rows = b.tasks.map(task => {
    const r = task.result;
    const hz = r?.throughput?.mean ?? 0;
    const latMs = r?.latency?.mean ?? 0;
    return {
        name: task.name,
        'ops/sec': hz ? Math.round(hz).toLocaleString() : '-',
        'avg (µs)': latMs ? (latMs * 1000).toFixed(1) : '-',
        'p99 (µs)': r?.latency?.p99 ? (r.latency.p99 * 1000).toFixed(1) : '-',
        samples: r?.latency?.samplesCount ?? 0,
    };
});
// Print full table
console.log('All results (ops/sec, higher = faster):\n');
console.table(rows);
// Compute speedup for each paired suite
console.log('\nSpeedup summary (ratatat ÷ ink):\n');
const pairs = [
    ['initial mount (simple)', 'ratatat · initial mount (simple)', 'ink     · initial mount (simple)'],
    ['initial mount (complex)', 'ratatat · initial mount (complex)', 'ink     · initial mount (complex)'],
    ['rerender (simple)', 'ratatat · rerender (simple, state changes)', 'ink     · rerender (simple, state changes)'],
    ['rerender (complex)', 'ratatat · rerender (complex, state changes)', 'ink     · rerender (complex, state changes)'],
];
for (const [label, rName, iName] of pairs) {
    const rTask = b.tasks.find(t => t.name === rName);
    const iTask = b.tasks.find(t => t.name === iName);
    if (rTask?.result && iTask?.result) {
        const rr = rTask.result;
        const ir = iTask.result;
        const rHz = rr.throughput?.mean ?? 0;
        const iHz = ir.throughput?.mean ?? 0;
        const speedup = (rHz / iHz).toFixed(1);
        const arrow = Number(speedup) >= 1 ? '🚀' : '🐢';
        console.log(`  ${label.padEnd(26)}  ${arrow}  ratatat is ${speedup}x faster than Ink`);
    }
}
console.log('');
process.exit(0);
