import { Renderer, TerminalSetup } from '../index.js';
import EventEmitter from 'eventemitter3';

export class RatatatApp extends EventEmitter {
  private renderer: Renderer;
  private backBuffer: Uint32Array;
  private width: number;
  private height: number;
  private isRunning: boolean = false;
  private renderQueued: boolean = false;

  constructor() {
    super();
    // Get terminal size via our N-API binding
    const size = TerminalSetup.getSize();
    this.width = size[0];
    this.height = size[1];

    this.renderer = new Renderer(this.width, this.height);
    this.backBuffer = new Uint32Array(this.width * this.height * 2);
  }

  start() {
    if (this.isRunning) return;
    
    // Enter raw mode and alternate screen
    TerminalSetup.enter();

    this.isRunning = true;
    
    // Begin the render loop queue
    this.queueRender();
  }

  stop() {
    this.isRunning = false;
    TerminalSetup.leave();
  }

  getBuffer(): Uint32Array {
    return this.backBuffer;
  }

  getSize(): { width: number, height: number } {
    return { width: this.width, height: this.height };
  }

  // Request a render on the next Node.js tick
  requestRender() {
    if (!this.renderQueued && this.isRunning) {
      this.renderQueued = true;
      setTimeout(() => this.tick(), 0);
    }
  }

  private queueRender() {
    if (!this.isRunning) return;
    
    // We use setTimeout to allow Node's async I/O events to process
    // Targeting roughly 60 FPS (16.6ms)
    setTimeout(() => {
      this.tick();
      this.queueRender();
    }, 16);
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
