/**
 * src/inline.ts — Inline rendering mode
 *
 * Renders a fixed-height region immediately below the current cursor,
 * without switching to the alternate screen.
 *
 * On exit, behavior is controlled by the `onExit` option:
 *   - 'preserve' (default) — rendered output stays in terminal scrollback
 *   - 'destroy'            — rendered lines are cleared, terminal looks untouched
 *
 * How it works:
 *   - First frame: render rows 0..N directly from the current cursor position.
 *     The terminal scrolls naturally if needed. No blank lines printed upfront.
 *   - Subsequent frames: move cursor up by the number of rows rendered, then
 *     let the Rust diff engine repaint only changed cells. The renderer always
 *     thinks it owns rows 0..N; the TS wrapper handles the cursor rewind.
 *   - On exit:
 *     - preserve: leave cursor below the last rendered row (output stays in scrollback)
 *     - destroy:  move cursor up, clear each line with \x1b[2K, return to start row
 */

import { Renderer } from '../index.js'

export interface InlineOptions {
  /** Number of terminal rows to reserve. Default: 10 */
  rows?: number
  /** Frames per second. Default: 60 */
  fps?: number
  /**
   * What to do with the rendered content when the loop stops.
   * - 'preserve' (default) — content stays in terminal scrollback
   * - 'destroy'            — content is cleared, terminal looks untouched
   */
  onExit?: 'preserve' | 'destroy'
}

export type InlinePaintFn = (buf: Uint32Array, cols: number, rows: number, frame: number) => void

export interface InlineLoop {
  start(): void
  stop(): void
}

/**
 * Create an inline render loop. Renders `rows` lines immediately below the
 * current cursor position (no alternate screen, no blank-line gap).
 *
 * @example
 * ```ts
 * const loop = createInlineLoop((buf, cols, rows) => {
 *   setCell(buf, cols, 0, 0, 'Hello!', 46)
 * }, { rows: 3, onExit: 'destroy' })
 * loop.start()
 * ```
 */
export function createInlineLoop(paint: InlinePaintFn, options: InlineOptions = {}): InlineLoop {
  const reservedRows = options.rows ?? 10
  const fps = options.fps ?? 60
  const onExit = options.onExit ?? 'preserve'

  const guard = new InlineGuard()
  const { cols, rows: termRows } = guard.getSize()
  const renderRows = Math.min(reservedRows, termRows)

  const renderer = new Renderer(cols, renderRows)
  const buf = new Uint32Array(cols * renderRows * 2)

  let frame = 0
  let interval: ReturnType<typeof setInterval> | null = null
  // How many rows we've actually painted so far (0 on first frame, renderRows after)
  let paintedRows = 0

  function tick() {
    if (paintedRows > 0) {
      // Rewind cursor to top of our region with relative moves
      process.stdout.write(`\x1b[${paintedRows}A\x1b[1G`)
    } else {
      // First frame: step past the prompt line onto a fresh line.
      // Then set rowOffset so the Rust renderer's absolute \x1b[row;colH
      // sequences land on this line rather than jumping back to row 1.
      process.stdout.write('\n\x1b[1G')
      // After the \n, cursor is at the bottom of the terminal (termRows, 1-based).
      // If the terminal scrolled, that's still termRows. Set offset = termRows - 1
      // (0-based) so buffer row 0 maps to the current terminal row.
      renderer.setRowOffset(termRows - 1)
    }

    buf.fill(0)
    paint(buf, cols, renderRows, frame++)
    renderer.render(buf)
    paintedRows = renderRows
  }

  function start() {
    guard.enter()
    process.on('SIGINT', stop)
    interval = setInterval(tick, Math.round(1000 / fps))
  }

  function stop() {
    if (interval) {
      clearInterval(interval)
      interval = null
    }

    if (onExit === 'destroy') {
      // Rewind to top of region (plus the leading newline), clear every line
      if (paintedRows > 0) {
        process.stdout.write(`\x1b[${paintedRows + 1}A\x1b[1G`)
      }
      for (let i = 0; i < renderRows + 1; i++) {
        process.stdout.write('\x1b[2K')
        if (i < renderRows) process.stdout.write('\n')
      }
      // Return cursor to the first line of the (now-cleared) region
      if (renderRows > 0) {
        process.stdout.write(`\x1b[${renderRows}A\x1b[1G`)
      }
    }
    // preserve: cursor is already below the last rendered row — nothing to do

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
    const cols = process.stdout.columns ?? 80
    const rows = process.stdout.rows ?? 24
    return { cols, rows }
  }

  enter() {
    if (this.active) return
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
    }
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdout.write('\x1b[?25l') // hide cursor
    this.active = true
  }

  leave() {
    if (!this.active) return
    this.active = false
    process.stdout.write('\x1b[?25h') // show cursor
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false)
    }
    process.stdin.pause()
  }
}
