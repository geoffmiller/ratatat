/**
 * scope.ts — Sine harmonic oscilloscope
 *
 * Plots multiple sine waves with slowly drifting frequencies and phases.
 * Each harmonic is a different color. The composite sum is drawn in white.
 * Looks like a real oscilloscope probing a complex signal.
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
  freqDrift: number // how fast freq drifts (cycles/sec)
  phase: number // current phase offset (radians)
  phaseDrift: number // phase drift rate (radians/sec)
  amp: number // amplitude (0-1)
  color: number // 256-color index
}

const HARMONICS: Harmonic[] = [
  { freq: 2.0, freqDrift: 0.07, phase: 0, phaseDrift: 0.8, amp: 0.35, color: 46 }, // green
  { freq: 3.0, freqDrift: -0.05, phase: 1.0, phaseDrift: -1.1, amp: 0.25, color: 51 }, // cyan
  { freq: 5.0, freqDrift: 0.11, phase: 2.1, phaseDrift: 1.7, amp: 0.2, color: 196 }, // red
  { freq: 7.0, freqDrift: -0.09, phase: 0.5, phaseDrift: -2.3, amp: 0.12, color: 226 }, // yellow
  { freq: 11.0, freqDrift: 0.13, phase: 3.2, phaseDrift: 3.1, amp: 0.08, color: 213 }, // pink
]

// ─── Paint ────────────────────────────────────────────────────────────────────

let lastT = performance.now() / 1000

function paint(buf: Uint32Array, cols: number, rows: number, _frame: number) {
  const t = performance.now() / 1000
  const dt = t - lastT
  lastT = t

  // Advance drifts
  for (const h of HARMONICS) {
    h.phase += h.phaseDrift * dt
    h.freq += h.freqDrift * dt
    // Clamp freq so it doesn't drift off to useless values
    h.freq = Math.max(0.5, Math.min(20, h.freq))
  }

  // Chart area — leave 1 row top/bottom for labels
  const chartTop = 1
  const chartBottom = rows - 2
  const chartHeight = chartBottom - chartTop
  const midRow = chartTop + Math.floor(chartHeight / 2)

  // Draw center line
  for (let x = 0; x < cols; x++) {
    setCell(buf, cols, x, midRow, '─', 235)
  }

  // For each column, compute each harmonic's value and the composite sum
  for (let x = 0; x < cols; x++) {
    const xNorm = x / (cols - 1) // 0..1 across the screen

    // Draw individual harmonics (dimmer, behind composite)
    for (const h of HARMONICS) {
      const v = h.amp * Math.sin(2 * Math.PI * h.freq * xNorm + h.phase)
      const row = midRow - Math.round(v * (chartHeight / 2))
      if (row < chartTop || row > chartBottom) continue
      setCell(buf, cols, x, row, '·', h.color)
    }

    // Composite sum
    let sum = 0
    for (const h of HARMONICS) {
      sum += h.amp * Math.sin(2 * Math.PI * h.freq * xNorm + h.phase)
    }
    // Normalize sum to [-1, 1]
    const totalAmp = HARMONICS.reduce((a, h) => a + h.amp, 0)
    const normSum = sum / totalAmp

    const compositeRow = midRow - Math.round(normSum * (chartHeight / 2))
    if (compositeRow >= chartTop && compositeRow <= chartBottom) {
      setCell(buf, cols, x, compositeRow, '█', 231, 0, 1) // bold white
    }
  }

  // Title bar
  const freqStr = HARMONICS.map((h) => h.freq.toFixed(1) + 'Hz').join('  ')
  const title = `   oscilloscope   harmonics: ${freqStr}   Ctrl+C quit  `
  for (let i = 0; i < Math.min(title.length, cols); i++) {
    setCell(buf, cols, i, rows - 1, title[i]!, 240)
  }

  // Y-axis labels
  setCell(buf, cols, 0, chartTop, '+', 235)
  setCell(buf, cols, 0, midRow, '0', 235)
  setCell(buf, cols, 0, chartBottom, '-', 235)
}

// ─── Run ─────────────────────────────────────────────────────────────────────

const loop = createLoop(paint, 60)
loop.start()
