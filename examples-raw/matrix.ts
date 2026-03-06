/**
 * matrix.ts — Matrix digital rain
 *
 * Each column has an independent falling drop at a random speed.
 * The drop head is bright white; the trail fades through green shades
 * to black. Characters randomize as the drop passes.
 *
 * Direct Uint32Array buffer painting — no React, no Yoga, no reconciler.
 *
 * Run: node --import @oxc-node/core/register examples-raw/matrix.ts
 *
 * Controls:
 *   Ctrl+C   quit
 */

import { createLoop, setCell } from './harness.js'

// ─── Character pool ───────────────────────────────────────────────────────────
// Katakana block + digits + a few Latin letters for that classic look
const CHARS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' + '0123456789ABCDEFZ'

function randomChar(): string {
  return CHARS[Math.floor(Math.random() * CHARS.length)]!
}

// ─── 256-color green fade palette ─────────────────────────────────────────────
// Index 0 = head (white-hot), then fading greens, then dark
const TRAIL_COLORS = [
  231, // 0: white  — head
  154, // 1: bright yellow-green
  46, // 2: bright green
  40, // 3: medium green
  34, // 4: green
  28, // 5: dark green
  22, // 6: very dark green
  238, // 7: near-black
  237, // 8: near-black
  236, // 9: near-black (fade out)
]
const TRAIL_LENGTH = TRAIL_COLORS.length

// ─── Drop state ───────────────────────────────────────────────────────────────

interface Drop {
  // Current head row (-1 to rows-1; negative = above screen, still falling in)
  head: number
  // How many frames between each row advance
  speed: number
  // Frame counter — drop advances when frameCount % speed === 0
  tick: number
  // Per-row character — randomizes as head passes
  chars: string[]
  // Is this drop active or resetting?
  active: boolean
  // Countdown frames before restarting after drop exits
  resetIn: number
}

let drops: Drop[] = []
let lastCols = 0
let lastRows = 0

function initDrops(cols: number, rows: number) {
  drops = []
  for (let x = 0; x < cols; x++) {
    drops.push(makeDropWithOffset(rows, x, cols))
  }
  lastCols = cols
  lastRows = rows
}

function makeDropWithOffset(rows: number, x: number, cols: number): Drop {
  // Stagger initial positions so drops don't all start at row 0 together
  const head = -Math.floor(Math.random() * rows) - 1
  return {
    head,
    speed: 1 + Math.floor(Math.random() * 4), // 1 = fast, 4 = slow
    tick: Math.floor(Math.random() * 4),
    chars: Array.from({ length: rows }, () => randomChar()),
    active: true,
    resetIn: 0,
  }
}

function makeDrop(rows: number): Drop {
  return {
    head: -1 - Math.floor(Math.random() * 5), // start just above screen
    speed: 1 + Math.floor(Math.random() * 4),
    tick: 0,
    chars: Array.from({ length: rows }, () => randomChar()),
    active: true,
    resetIn: 0,
  }
}

// ─── Paint ────────────────────────────────────────────────────────────────────

function paint(buf: Uint32Array, cols: number, rows: number, frame: number) {
  // Init on first frame, reinit only on genuine resize
  if (drops.length === 0) {
    initDrops(cols, rows)
  } else if (cols !== lastCols || rows !== lastRows) {
    // Resize: rebuild drop array but preserve active drops where possible
    const prevDrops = drops
    drops = []
    for (let x = 0; x < cols; x++) {
      if (x < prevDrops.length) {
        const d = prevDrops[x]!
        // Clamp head to new row count, rebuild chars array for new height
        d.head = Math.min(d.head, rows - 1)
        d.chars = Array.from({ length: rows }, (_, i) => d.chars[i] ?? randomChar())
        drops.push(d)
      } else {
        drops.push(makeDropWithOffset(rows, x, cols))
      }
    }
    lastCols = cols
    lastRows = rows
  }

  // Advance and paint each column
  for (let x = 0; x < cols; x++) {
    const drop = drops[x]!

    if (!drop.active) {
      // Waiting to restart
      drop.resetIn--
      if (drop.resetIn <= 0) {
        drops[x] = makeDrop(rows)
      }
      continue
    }

    // Advance head by one row every `speed` frames
    drop.tick++
    if (drop.tick >= drop.speed) {
      drop.tick = 0
      drop.head++

      // Randomly mutate a character in the trail as it passes (glitch effect)
      if (drop.head >= 0 && drop.head < rows) {
        const mutateRow = Math.max(0, drop.head - Math.floor(Math.random() * 3))
        drop.chars[mutateRow] = randomChar()
      }

      // Drop has fully exited the screen
      if (drop.head >= rows + TRAIL_LENGTH) {
        drop.active = false
        drop.resetIn = Math.floor(Math.random() * 40) // pause before restarting
        continue
      }
    }

    // Paint the trail — from head down to tail
    for (let t = 0; t < TRAIL_LENGTH; t++) {
      const row = drop.head - t
      if (row < 0 || row >= rows) continue

      const char = drop.chars[row] ?? randomChar()
      const color = TRAIL_COLORS[t]!
      const isBold = t === 0 // head is bold
      setCell(buf, cols, x, row, char, color, 0, isBold ? 1 : 0)
    }
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────

const loop = createLoop(paint, 24) // 24fps — rain doesn't need 60
loop.start()
