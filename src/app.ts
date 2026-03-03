import { Renderer, TerminalGuard } from '../index.js';
import EventEmitter from 'eventemitter3';

export class RatatatApp extends EventEmitter {
  private renderer: Renderer;
  private terminal: TerminalGuard | null = null;
  private backBuffer: Uint32Array;
  private width: number;
  private height: number;
  private isRunning: boolean = false;
  private renderQueued: boolean = false;

  constructor() {
    super();
    // Create a temporary guard just to query terminal size, then leave.
    // The actual enter happens in start().
    const probe = new TerminalGuard();
    const size = probe.getSize();
    this.width = size.cols;
    this.height = size.rows;
    probe.leave();

    this.renderer = new Renderer(this.width, this.height);
    this.backBuffer = new Uint32Array(this.width * this.height * 2);
  }

  /** Enters raw mode + alternate screen. Does NOT start any render loop. */
  start() {
    if (this.isRunning) return;

    // Enter raw mode and alternate screen (RAII guard)
    this.terminal = new TerminalGuard();

    this.isRunning = true;
  }

  /** Request a clean exit — restores terminal, stops input, exits the process. */
  quit() {
    this.emit('quit');
  }

  /** Exits raw mode + alternate screen. */
  stop() {
    this.isRunning = false;
    this.terminal?.leave();
    this.terminal = null;
  }

  /** Returns the shared Uint32Array back-buffer (width * height * 2 u32 cells). */
  getBuffer(): Uint32Array {
    return this.backBuffer;
  }

  /** Returns current terminal dimensions. */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Schedules a single render on the next Node.js tick.
   * Debounced: multiple calls before the tick fires result in exactly one render.
   * Emits: 'render' (buffer: Uint32Array, width: number, height: number)
   */
  requestRender() {
    if (!this.renderQueued && this.isRunning) {
      this.renderQueued = true;
      setTimeout(() => this.tick(), 0);
    }
  }

  private tick() {
    if (!this.isRunning) return;
    this.renderQueued = false;

    // This is where React Reconciler will eventually write to `this.backBuffer`
    this.emit('render', this.backBuffer, this.width, this.height);

    // Pass the pointer to Rust (Zero-copy)
    this.renderer.render(this.backBuffer);
  }
}
