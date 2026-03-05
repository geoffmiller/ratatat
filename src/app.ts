import { Renderer, TerminalGuard } from '../index.js'
import EventEmitter from 'eventemitter3'

export class RatatatApp extends EventEmitter {
  private renderer: Renderer
  private terminal: TerminalGuard | null = null
  private backBuffer: Uint32Array
  private width: number
  private height: number
  private isRunning: boolean = false
  private stdoutBuffer: string[] = []
  private stderrBuffer: string[] = []

  constructor() {
    super()
    // Get terminal size from process.stdout — works without a TTY (falls back to 80×24).
    // The TerminalGuard is only constructed in start() when we actually need raw mode.
    this.width = process.stdout.columns || 80
    this.height = process.stdout.rows || 24

    this.renderer = new Renderer(this.width, this.height)
    this.backBuffer = new Uint32Array(this.width * this.height * 2)
  }

  /** Enters raw mode + alternate screen. Does NOT start any render loop. */
  start() {
    if (this.isRunning) return

    // Enter raw mode and alternate screen (RAII guard)
    this.terminal = new TerminalGuard()

    this.isRunning = true
  }

  /** Request a clean exit — restores terminal, stops input, exits the process. */
  quit() {
    this.emit('quit')
  }

  /** Exits raw mode + alternate screen, then flushes any buffered stdout/stderr. */
  stop() {
    this.isRunning = false
    this.terminal?.leave()
    this.terminal = null
    // Flush buffered output now that the alternate screen is gone
    if (this.stdoutBuffer.length > 0) {
      process.stdout.write(this.stdoutBuffer.join(''))
      this.stdoutBuffer = []
    }
    if (this.stderrBuffer.length > 0) {
      process.stderr.write(this.stderrBuffer.join(''))
      this.stderrBuffer = []
    }
  }

  /**
   * Buffer a write to stdout. While the alternate screen is active, writing
   * directly would corrupt the TUI. Buffered output is flushed on stop().
   */
  writeStdout(text: string) {
    if (this.isRunning) {
      this.stdoutBuffer.push(text)
    } else {
      process.stdout.write(text)
    }
  }

  /**
   * Buffer a write to stderr. While the alternate screen is active, writing
   * directly would corrupt the TUI. Buffered output is flushed on stop().
   */
  writeStderr(text: string) {
    if (this.isRunning) {
      this.stderrBuffer.push(text)
    } else {
      process.stderr.write(text)
    }
  }

  /** Returns the shared Uint32Array back-buffer (width * height * 2 u32 cells). */
  getBuffer(): Uint32Array {
    return this.backBuffer
  }

  /** Returns current terminal dimensions. */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height }
  }

  /** Update terminal dimensions (called on SIGWINCH). */
  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.renderer = new Renderer(width, height)
    this.backBuffer = new Uint32Array(width * height * 2)
  }

  /**
   * Layout + paint synchronously. Called from the render loop on every dirty frame,
   * and directly on resize for immediate response.
   */
  paintNow(
    calculateLayout: (w: number, h: number) => void,
    renderToBuffer: (buf: Uint32Array, w: number, h: number) => void,
  ) {
    if (!this.isRunning) return
    calculateLayout(this.width, this.height)
    renderToBuffer(this.backBuffer, this.width, this.height)
    this.renderer.render(this.backBuffer)
  }
}
