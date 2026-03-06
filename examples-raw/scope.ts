/**
 * scope.ts — Sine harmonic oscilloscope
 *
 * Plots multiple sine waves with slowly drifting frequencies and phases.
 * Each harmonic is a distinct Ratatat brand color. The composite sum is
 * drawn as a bright white line on top. Looks like a real oscilloscope.
 *
 * Direct Uint32Array buffer painting — no React, no Yoga, no reconciler.
 *
 * Run: node --import @oxc-node/core/register examples-raw/scope.ts
 *
 * Controls:
 *   Ctrl+C   quit
 */

import { createLoop, setCell } from './harness.js'

// ─── Harmonics ────────────────────────────────────────────────────────────────

interface Harmonic {
  freq: number // base cycles across the screen
  freqDrift: number // drift rate (cycles/sec)
  phase: number // current phase offset (radians)
  phaseDrift: number // phase drift rate (radians/sec)
  amp: number // amplitude 0–1
  color: number // 256-color fg index
}

const HARMONICS: Harmonic[] = [
  { freq: 2.0, freqDrift: 0.07, phase: 0.0, phaseDrift: 0.8, amp: 0.35, color: 51 }, // cyan
  { freq: 3.0, freqDrift: -0.05, phase: 1.0, phaseDrift: -1.1, amp: 0.25, color: 213 }, // magenta
  { freq: 5.0, freqDrift: 0.11, phase: 2.1, phaseDrift: 1.7, amp: 0.2, color: 226 }, // yellow
  { freq: 7.0, freqDrift: -0.09, phase: 0.5, phaseDrift: -2.3, amp: 0.12, color: 46 }, // green
  { freq: 11.0, freqDrift: 0.13, phase: 3.2, phaseDrift: 3.1, amp: 0.08, color: 208 }, // orange
]

// ─── Paint ────────────────────────────────────────────────────────────────────

let lastT = performance.now() / 1000

function paint(buf: Uint32Array, cols: number, rows: number, _frame: number) {
  const t = performance.now() / 1000
  const dt = Math.min(t - lastT, 0.1) // clamp dt so a tab switch doesn't explode phases
  lastT = t

  // Advance drifts
  for (const h of HARMONICS) {
    h.phase += h.phaseDrift * dt
    h.freq = Math.max(0.5, Math.min(20, h.freq + h.freqDrift * dt))
  }

  // Chart area — 1 row padding top and bottom for labels
  const chartTop = 1
  const chartBottom = rows - 2
  const chartHeight = chartBottom - chartTop
  const midRow = chartTop + Math.floor(chartHeight / 2)
  const halfH = chartHeight / 2

  // Center line
  for (let x = 0; x < cols; x++) {
    setCell(buf, cols, x, midRow, '─', 234)
  }

  // Precompute composite and per-harmonic rows for each column,
  // then draw composite first (bottom layer), harmonics on top.
  const totalAmp = HARMONICS.reduce((a, h) => a + h.amp, 0)

  for (let x = 0; x < cols; x++) {
    const xNorm = x / Math.max(cols - 1, 1)

    // Composite sum — draw first so harmonics paint over it
    let sum = 0
    for (const h of HARMONICS) {
      sum += h.amp * Math.sin(2 * Math.PI * h.freq * xNorm + h.phase)
    }
    const normSum = sum / totalAmp
    const compositeRow = midRow - Math.round(normSum * halfH)
    if (compositeRow >= chartTop && compositeRow <= chartBottom) {
      setCell(buf, cols, x, compositeRow, '▪', 231, 0, 1) // bright white ▪, bold, no bg fill
    }

    // Individual harmonics — drawn on top of composite
    for (const h of HARMONICS) {
      const v = h.amp * Math.sin(2 * Math.PI * h.freq * xNorm + h.phase)
      const row = midRow - Math.round(v * halfH)
      if (row < chartTop || row > chartBottom) continue
      // Bold ▪ so harmonics are clearly visible against the background
      setCell(buf, cols, x, row, '▪', h.color, 0, 1)
    }
  }

  // Y-axis tick marks
  setCell(buf, cols, 2, chartTop, '+', 240)
  setCell(buf, cols, 2, midRow, '·', 240)
  setCell(buf, cols, 2, chartBottom, '-', 240)

  // Legend — harmonic colors + composite
  const labels = [
    { label: '▪ composite', color: 231 },
    { label: '▪ f1', color: HARMONICS[0]!.color },
    { label: '▪ f2', color: HARMONICS[1]!.color },
    { label: '▪ f3', color: HARMONICS[2]!.color },
    { label: '▪ f4', color: HARMONICS[3]!.color },
    { label: '▪ f5', color: HARMONICS[4]!.color },
  ]
  let legendX = 4
  for (const { label, color } of labels) {
    for (let i = 0; i < label.length; i++) {
      setCell(buf, cols, legendX + i, chartTop, label[i]!, color, 0, 1)
    }
    legendX += label.length + 2
    if (legendX >= cols - 20) break
  }

  // Status bar
  const freqStr = HARMONICS.map((h) => h.freq.toFixed(1) + 'Hz').join('  ')
  const status = `  harmonics: ${freqStr}   Ctrl+C quit  `
  for (let i = 0; i < Math.min(status.length, cols); i++) {
    setCell(buf, cols, i, rows - 1, status[i]!, 240)
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────

const loop = createLoop(paint, 60)
loop.start()
