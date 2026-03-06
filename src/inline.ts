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
 *   - start() queries the real terminal size via terminalSize() (crossterm,
 *     not Node's stream layer — always correct).
 *   - Sets rowOffset = termRows - 1 so the Rust renderer's absolute cursor
 *     moves land on the correct row after the leading \n.
 *   - First frame fires immediately in start() — cursor sits below the region.
 *   - Subsequent frames: rewind renderRows rows, repaint changed cells.
 *   - On exit:
 *     - preserve: cursor already below region — nothing to do
 *     - destroy:  rewind, clear every line, return cursor to prompt row
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
    // terminalSize() calls crossterm::terminal::size() directly —
    // always correct, no alternate screen, no Node stream layer.
    const size = terminalSize()
    cols = size.cols
    const termRows = size.rows
    renderRows = Math.min(reservedRows, termRows)

    // Raw mode (Node layer only — no alternate screen)
    if (process.stdin.isTTY) process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdout.write('\x1b[?25l') // hide cursor

    process.on('SIGINT', stop)

    renderer = new Renderer(cols, renderRows)
    buf = new Uint32Array(cols * renderRows * 2)

    // rowOffset anchors buffer row 0 to the terminal row the cursor will be
    // on after the leading \n below. After \n the cursor is at termRows
    // (1-based) = termRows - 1 in 0-based offset terms.
    renderer.setRowOffset(termRows - 1)

    // Step past the prompt line, then paint the first frame immediately.
    // Cursor is now below the rendered region.
    process.stdout.write('\n')
    tick()

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
      // Rewind past rendered rows + the leading \n, clear everything
      process.stdout.write(`\x1b[${renderRows + 1}A\x1b[1G`)
      for (let i = 0; i < renderRows + 1; i++) {
        process.stdout.write('\x1b[2K')
        if (i < renderRows) process.stdout.write('\n')
      }
      process.stdout.write(`\x1b[${renderRows}A\x1b[1G`)
    }
    // preserve: cursor already below last rendered row — nothing to do

    process.stdout.write('\x1b[?25h') // show cursor
    if (process.stdin.isTTY) process.stdin.setRawMode(false)
    process.stdin.pause()
    process.exit(0)
  }

  return { start, stop }
}
