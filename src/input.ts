import EventEmitter from 'eventemitter3';

export class InputParser extends EventEmitter {
  private _boundHandleData: ((data: string) => void) | null = null;

  constructor(private stdin: NodeJS.ReadStream) {
    super();
  }

  start() {
    // Raw mode is owned by TerminalGuard (crossterm) — do NOT call setRawMode here.
    // Calling Node's setRawMode after crossterm already set raw mode via the OS
    // disrupts the terminal state and silences stdin data events.
    this.stdin.resume();
    this.stdin.setEncoding('utf8');
    this._boundHandleData = this.handleData.bind(this);
    this.stdin.on('data', this._boundHandleData);
  }

  stop() {
    // Raw mode is restored by TerminalGuard.leave() — do NOT call setRawMode here.
    this.stdin.pause();
    if (this._boundHandleData) {
      this.stdin.removeListener('data', this._boundHandleData);
      this._boundHandleData = null;
    }
  }

  private handleData(data: string) {
    // 1. Check for basic Ctrl+C to exit
    if (data === '\u0003') {
      this.emit('exit');
      return;
    }

    // 2. Parse Arrow Keys
    if (data === '\u001b[A') { this.emit('keydown', 'up'); return; }
    if (data === '\u001b[B') { this.emit('keydown', 'down'); return; }
    if (data === '\u001b[C') { this.emit('keydown', 'right'); return; }
    if (data === '\u001b[D') { this.emit('keydown', 'left'); return; }

    // 3. Parse Tab / Shift+Tab
    if (data === '\t') { this.emit('keydown', 'tab'); return; }
    if (data === '\u001b[Z') { this.emit('keydown', 'shift-tab'); return; }

    // 4. Parse Escape
    if (data === '\u001b') { this.emit('keydown', 'escape'); return; }

    // 5. Parse Enter/Return
    if (data === '\r' || data === '\n') { this.emit('keydown', 'enter'); return; }

    // 4. Mouse Tracking (SGR 1006 protocol format: \x1b[<button;x;yM or m)
    // Example: \x1b[<0;10;10M
    if (data.startsWith('\u001b[<')) {
      const match = data.match(/\u001b\[<(\d+);(\d+);(\d+)([Mm])/);
      if (match) {
        const buttonCode = parseInt(match[1]);
        const x = parseInt(match[2]) - 1; // 1-indexed to 0-indexed
        const y = parseInt(match[3]) - 1;
        const isRelease = match[4] === 'm';

        // Emulate simple Left Click
        if (buttonCode === 0 || buttonCode === 32) {
          if (!isRelease) {
            this.emit('click', { x, y });
          }
        }
      }
      return;
    }

    // Default to emitting the raw data
    this.emit('data', data);
  }
}
