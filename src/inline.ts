/**
 * src/inline.ts — Inline rendering mode
 *
 * Renders a fixed-height region immediately below the current cursor,
 * without switching to the alternate screen.
 *
 * Strategy:
 *   1. Print renderRows newlines — makes room even if cursor was near the bottom.
 *      The terminal scrolls as needed; the prompt line stays in scrollback.
 *   2. Send CPR (\x1b[6n) and read the response (\x1b[row;colR) — this tells
 *      us the exact terminal row the cursor is on after scrolling.
 *   3. Rewind renderRows rows up — cursor is now at the top of the region.
 *   4. setRowOffset(row - renderRows - 1) so Rust absolute moves land correctly.
 *   5. Render first frame. Subsequent frames: rewind renderRows, render.
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

  function startRendering(cursorRow: number) {
    // cursorRow is 1-based, the row the cursor is on AFTER the leading newlines.
    // Rewind renderRows up — cursor now at top of our region.
    process.stdout.write(`\x1b[${renderRows}A\x1b[1G`)

    // rowOffset: buffer row 0 must map to terminal row (cursorRow - renderRows).
    // Rust emits \x1b[offset+bufRow+1;colH, so:
    //   offset + 0 + 1 = cursorRow - renderRows
    //   offset = cursorRow - renderRows - 1
    renderer!.setRowOffset(cursorRow - renderRows - 1)

    tick()

    interval = setInterval(
      () => {
        process.stdout.write(`\x1b[${renderRows}A\x1b[1G`)
        tick()
      },
      Math.round(1000 / fps),
    )
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

    // Reserve space and query cursor position via CPR.
    // Print renderRows newlines so there's room even at the bottom of the terminal.
    // Then request cursor position — terminal responds with \x1b[row;colR on stdin.
    process.stdout.write('\n'.repeat(renderRows))
    process.stdout.write('\x1b[6n') // CPR request

    // Read CPR response from stdin, then start rendering
    let cprBuf = ''
    const onData = (chunk: string) => {
      cprBuf += chunk
      const m = cprBuf.match(/\x1b\[(\d+);(\d+)R/)
      if (m) {
        process.stdin.off('data', onData)
        const cursorRow = parseInt(m[1], 10)
        startRendering(cursorRow)
      }
    }
    process.stdin.on('data', onData)
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
