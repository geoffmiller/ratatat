import { Renderer, TerminalGuard, terminalSize } from '@ratatat/core'

const MARKER = 'RATATAT_CORE_STARTUP_READY'

const guard = new TerminalGuard()
const { cols, rows } = terminalSize()
const width = Math.max(1, cols)
const height = Math.max(1, rows)

const renderer = new Renderer(width, height)
const buf = new Uint32Array(width * height * 2)

const maxCells = width * height
for (let i = 0; i < maxCells; i++) {
  const idx = i * 2
  buf[idx] = 32
  buf[idx + 1] = (0 << 16) | (255 << 8) | 15
}

renderer.render(buf)
renderer.writeRaw(MARKER)

setTimeout(() => {
  guard.leave()
  process.exit(0)
}, 0)
