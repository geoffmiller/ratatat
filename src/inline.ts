/**
 * src/inline.ts — Inline rendering mode
 *
 * Renders a fixed-height region immediately below the current cursor,
 * without switching to the alternate screen.
 *
 * Strategy:
 *   - Print `renderRows` newlines to scroll the terminal and reserve space.
 *   - Rewind cursor back up by `renderRows` — cursor is now at the TOP of
 *     the reserved region, which is guaranteed to fit on screen.
 *   - rowOffset stays 0 (default). The Rust renderer's absolute moves
 *     (\x1b[1;1H etc) are wrong — we use only the relative rewind before
 *     each frame, which puts the cursor at the right place.
 *
 * Wait — the Rust renderer still emits absolute moves. We can't avoid them.
 * The fix: don't use absolute moves at all for inline. Use CPR (\x1b[6n)
 * to query the cursor row after reserving space, then setRowOffset to that.
 *
 * Actual strategy (no CPR needed):
 *   - Print renderRows newlines → terminal scrolls, cursor at bottom of region.
 *   - Rewind renderRows rows up → cursor at TOP of region.
 *   - Query that row via the fact that after scroll+rewind, we know exactly
 *     where the cursor is: termRows - renderRows (1-based).
 *   - setRowOffset(termRows - renderRows - 1) so buffer row 0 → that terminal row.
 *   - Subsequent frames: rewind renderRows, render. Correct.
 */

import { Renderer, terminalSize } from '../index.js'

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
 * current cursor position (no alternate screen).
 */
export function createInlineLoop(paint: InlinePaintFn, options: InlineOptions = {}): InlineLoop {
  const reservedRows = options.rows ?? 10
  const fps = options.fps ?? 60
  const onExit = options.onExit ?? 'preserve'

  let interval: ReturnType<typeof setInterval> | null = null
  let renderer: Renderer | null = null
  let buf: Uint32Array | null = null
  let cols = 80
  let renderRows = 10
  let frame = 0

  function tick() {
    buf!.fill(0)
    paint(buf!, cols, renderRows, frame++)
    renderer!.render(buf!)
  }

  function start() {
    const size = terminalSize()
    cols = size.cols
    const termRows = size.rows
    renderRows = Math.min(reservedRows, termRows)

    if (process.stdin.isTTY) process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdout.write('\x1b[?25l') // hide cursor

    process.on('SIGINT', stop)

    renderer = new Renderer(cols, renderRows)
    buf = new Uint32Array(cols * renderRows * 2)

    // Reserve space: print renderRows newlines so the terminal scrolls
    // and the region fits entirely on screen. Then rewind back to the
    // top of the region.
    //
    // After the newlines, cursor is at the bottom of the terminal (row termRows).
    // After rewinding renderRows rows up, cursor is at row (termRows - renderRows).
    // That's 0-based offset: termRows - renderRows - 1.
    //
    // We don't print renderRows+1 (for the prompt line) because the prompt
    // line is already above row 1 of our region — it's in the scrollback.
    process.stdout.write('\n'.repeat(renderRows))
    process.stdout.write(`\x1b[${renderRows}A\x1b[1G`)
    renderer.setRowOffset(termRows - renderRows - 1)

    tick() // first frame

    interval = setInterval(
      () => {
        process.stdout.write(`\x1b[${renderRows}A\x1b[1G`)
        tick()
      },
      Math.round(1000 / fps),
    )
  }

  function stop() {
    if (interval) {
      clearInterval(interval)
      interval = null
    }

    if (onExit === 'destroy') {
      // Rewind to top of region, clear every line
      process.stdout.write(`\x1b[${renderRows}A\x1b[1G`)
      for (let i = 0; i < renderRows; i++) {
        process.stdout.write('\x1b[2K')
        if (i < renderRows - 1) process.stdout.write('\n')
      }
      process.stdout.write(`\x1b[${renderRows - 1}A\x1b[1G`)
    }
    // preserve: cursor already at bottom of region

    process.stdout.write('\x1b[?25h') // show cursor
    if (process.stdin.isTTY) process.stdin.setRawMode(false)
    process.stdin.pause()
    process.exit(0)
  }

  return { start, stop }
}
