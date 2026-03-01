import { Bench } from 'tinybench'
import { Renderer } from '../dist/index.js'

const COLS = 80
const ROWS = 24
const CELLS = COLS * ROWS

// Pre-built back-buffers
const emptyBuffer = new Uint32Array(CELLS * 2) // all zeros — no diff

const fullBuffer = new Uint32Array(CELLS * 2)
for (let i = 0; i < CELLS; i++) {
  fullBuffer[i * 2] = 65 + (i % 26)    // 'A'-'Z' cycling
  fullBuffer[i * 2 + 1] = (1 << 16) | (2 << 8) | 15 // styles=1, bg=2, fg=15
}

const b = new Bench({ iterations: 500 })

// Case 1: empty buffer — renderer has no front-buffer state, every cell differs on first pass,
// then nothing differs on subsequent calls (front === back)
b.add('generate_diff — empty buffer (after first sync)', () => {
  const renderer = new Renderer(COLS, ROWS)
  renderer.render(emptyBuffer) // prime front-buffer
  // Now nothing differs — measures the "nothing changed" hot path
  renderer.render(emptyBuffer)
})

// Case 2: full buffer — every cell has content, first call is a max-diff (all cells dirty)
b.add('generate_diff — full buffer (max diff, all cells dirty)', () => {
  const renderer = new Renderer(COLS, ROWS)
  renderer.render(fullBuffer)
})

// Case 3: incremental update — 1% of cells change each frame (realistic TUI workload)
b.add('generate_diff — incremental (1% cells dirty per frame)', () => {
  const renderer = new Renderer(COLS, ROWS)
  renderer.render(fullBuffer) // prime
  const updated = new Uint32Array(fullBuffer)
  for (let i = 0; i < CELLS * 0.01; i++) {
    const cell = Math.floor(Math.random() * CELLS)
    updated[cell * 2] = 66 + (i % 26)
  }
  renderer.render(updated)
})

await b.run()

console.table(b.table())
