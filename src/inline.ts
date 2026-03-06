/**
 * src/inline.ts — Inline rendering mode
 *
 * Renders a fixed-height region immediately below the current cursor,
 * without switching to the alternate screen.
 *
 * Strategy:
 *   1. Print renderRows newlines — makes room even if cursor was near the bottom.
 *   2. Send CPR (\x1b[6n) and read the response (\x1b[row;colR) — exact cursor row.
 *   3. Rewind renderRows rows up — cursor is now at the TOP of the reserved region.
 *      Save this as regionTopRow for use in destroy cleanup.
 *   4. setRowOffset(regionTopRow - 1) so Rust absolute moves land correctly.
 *   5. Render first frame. Subsequent frames: rewind renderRows, render.
 *   6. On destroy: rewind min(renderRows, regionTopRow-1) rows (never above row 1),
 *      clear each line, leave cursor at the top of the cleared area.
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
  // 1-based terminal row of the top of our render region — set once CPR resolves
  let regionTopRow = 1

  function tick() {
    buf!.fill(0)
    paint(buf!, cols, renderRows, frame++)
    renderer!.render(buf!)
  }

  function startRendering(cursorRow: number) {
    // cursorRow is 1-based — the row cursor is on AFTER the leading newlines.
    // Rewind renderRows up — cursor now at top of our region.
    regionTopRow = cursorRow - renderRows
    process.stdout.write(`\x1b[${renderRows}A\x1b[1G`)

    // rowOffset: Rust emits \x1b[offset+bufRow+1;colH
    // We need offset+0+1 = regionTopRow → offset = regionTopRow - 1
    renderer!.setRowOffset(regionTopRow - 1)

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

    // Reserve space then query exact cursor position via CPR.
    process.stdout.write('\n'.repeat(renderRows))
    process.stdout.write('\x1b[6n')

    let cprBuf = ''
    const onData = (chunk: string) => {
      cprBuf += chunk
      const m = cprBuf.match(/\x1b\[(\d+);(\d+)R/)
      if (m) {
        process.stdin.off('data', onData)
        startRendering(parseInt(m[1], 10))
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
      // After the last tick(), cursor is on the last row of the region.
      // Rewind to regionTopRow (renderRows - 1 rows up), clear each line,
      // leave cursor at the top of the now-cleared area.
      if (renderRows > 1) process.stdout.write(`\x1b[${renderRows - 1}A\x1b[1G`)
      for (let i = 0; i < renderRows; i++) {
        process.stdout.write('\x1b[2K')
        if (i < renderRows - 1) process.stdout.write('\n')
      }
      if (renderRows > 1) process.stdout.write(`\x1b[${renderRows - 1}A\x1b[1G`)
    }
    // preserve: cursor already at bottom of region

    process.stdout.write('\x1b[?25h') // show cursor
    if (process.stdin.isTTY) process.stdin.setRawMode(false)
    process.stdin.pause()
    process.exit(0)
  }

  return { start, stop }
}
