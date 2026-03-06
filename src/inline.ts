/**
 * src/inline.ts — Inline rendering mode
 *
 * Renders a fixed-height region in the normal terminal flow, without
 * switching to the alternate screen. The rendered output stays in the
 * terminal's scrollback when the app exits.
 *
 * How it works:
 *   1. On first frame, print `rows` blank lines then move cursor back up —
 *      this reserves vertical space in the scrollback without alternate screen.
 *   2. Save the cursor row at that point as the "render origin".
 *   3. Each frame, move cursor back to the render origin and let the Rust
 *      diff engine paint only changed cells using `setRowOffset`.
 *   4. On exit, move cursor below the rendered region so the shell prompt
 *      appears cleanly after the output.
 */

import { Renderer } from '../index.js'

export interface InlineOptions {
  /** Number of terminal rows to reserve. Default: 10 */
  rows?: number
  /** Frames per second. Default: 60 */
  fps?: number
}

export type InlinePaintFn = (buf: Uint32Array, cols: number, rows: number, frame: number) => void

export interface InlineLoop {
  start(): void
  stop(): void
}

/**
 * Create an inline render loop. Renders `rows` lines in the terminal
 * flow (no alternate screen). Output persists in scrollback on exit.
 *
 * @example
 * ```ts
 * const loop = createInlineLoop((buf, cols, rows) => {
 *   setCell(buf, cols, 0, 0, 'Hello!', 46)
 * }, { rows: 3 })
 * loop.start()
 * ```
 */
export function createInlineLoop(paint: InlinePaintFn, options: InlineOptions = {}): InlineLoop {
  const reservedRows = options.rows ?? 10
  const fps = options.fps ?? 60

  // Inline mode: raw mode only, no alternate screen
  const guard = new InlineGuard()
  const { cols, rows: termRows } = guard.getSize()

  // Clamp reserved rows to terminal height
  const renderRows = Math.min(reservedRows, termRows)

  const renderer = new Renderer(cols, renderRows)
  const buf = new Uint32Array(cols * renderRows * 2)

  let frame = 0
  let interval: ReturnType<typeof setInterval> | null = null
  let originRow = 0 // 0-based terminal row of the top of our region
  let firstFrame = true

  function tick() {
    const { cols: currentCols, rows: currentRows } = guard.getSize()
    const currentRenderRows = Math.min(reservedRows, currentRows)

    // Handle resize
    if (currentCols !== cols || currentRenderRows !== renderRows) {
      renderer.resize(currentCols, currentRenderRows)
      // Recalculate origin — we can't know where we are after resize, so reset
      firstFrame = true
    }

    if (firstFrame) {
      // Reserve space: print blank lines then move back up
      // This anchors our render region at the current cursor position
      process.stdout.write('\n'.repeat(renderRows))
      process.stdout.write(`\x1b[${renderRows}A`)

      // Query cursor position to get the actual origin row
      // We can't query synchronously, so we approximate:
      // After printing N lines and moving back up, we're at the top of our region.
      // The row offset is whatever row we're currently on.
      // Since we can't get it synchronously, use a heuristic: assume cursor is
      // at (terminalRows - renderRows) after the blank lines scroll into view.
      // This works correctly when the terminal needs to scroll.
      originRow = Math.max(0, currentRows - renderRows)
      renderer.setRowOffset(originRow)
      firstFrame = false
    } else {
      // Move cursor back to top of our region
      process.stdout.write(`\x1b[${originRow + 1};1H`)
    }

    buf.fill(0)
    paint(buf, cols, renderRows, frame++)
    renderer.render(buf)
  }

  function start() {
    // Set raw mode without alternate screen
    guard.enter()

    // Handle Ctrl+C
    process.on('SIGINT', stop)

    interval = setInterval(tick, Math.round(1000 / fps))
  }

  function stop() {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
    // Move cursor below our region so the shell prompt lands correctly
    process.stdout.write(`\x1b[${originRow + renderRows + 1};1H\n`)
    guard.leave()
    process.exit(0)
  }

  return { start, stop }
}

/**
 * A minimal terminal guard for inline mode — raw mode only, no alternate screen.
 */
class InlineGuard {
  private active = false

  getSize(): { cols: number; rows: number } {
    const [cols, rows] = process.stdout.columns ? [process.stdout.columns, process.stdout.rows] : [80, 24]
    return { cols, rows }
  }

  enter() {
    if (this.active) return
    // We need raw mode for keyboard input but NOT alternate screen
    // Use the existing TerminalGuard just to get raw mode, then immediately
    // leave the alternate screen portion — or better, handle it manually.
    // crossterm raw mode is set via the Rust TerminalGuard; for inline mode
    // we use stdin.setRawMode directly (Node's layer) since we don't need
    // the Rust terminal setup.
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
    }
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    // Hide cursor during rendering
    process.stdout.write('\x1b[?25l')
    this.active = true
  }

  leave() {
    if (!this.active) return
    this.active = false
    // Show cursor
    process.stdout.write('\x1b[?25h')
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false)
    }
    process.stdin.pause()
  }
}
