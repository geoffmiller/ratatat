# Quickstart: Raw-Buffer Mode

Drive the Ratatat Rust renderer directly — no React, no Yoga, no JSX.

This mode gives you full manual control over every cell in the terminal. It's the right choice for high-performance animations, game loops, and anything where React's overhead would get in the way.

## Minimal example

```ts
import { Renderer, TerminalGuard, terminalSize } from 'ratatat'

const { cols, rows } = terminalSize()
const guard = new TerminalGuard()
const renderer = new Renderer(cols, rows)

// 2 u32 slots per cell: [codepoint, attrCode]
const buf = new Uint32Array(cols * rows * 2)

let frame = 0

const loop = setInterval(() => {
  buf.fill(0)

  // Write 'Hello!' starting at column 2, row 2
  const text = `Hello! Frame ${frame++}`
  for (let i = 0; i < text.length; i++) {
    const idx = (2 * cols + 2 + i) * 2
    buf[idx] = text.codePointAt(i)! // codepoint
    buf[idx + 1] = (1 << 16) | (2 << 8) | 6 // bold | bg=green(2) | fg=cyan(6)
  }

  renderer.render(buf)
}, 16)

process.on('SIGINT', () => {
  clearInterval(loop)
  guard.leave()
  process.exit(0)
})
```

Run it:

```bash
node --import @oxc-node/core/register app.ts
```

---

## The buffer contract

Each cell in the terminal occupies **two consecutive `u32` slots**:

```
buf[idx * 2]     = Unicode codepoint   (the character)
buf[idx * 2 + 1] = attr code
```

Cell index for position `(col, row)`:

```ts
const idx = row * cols + col
```

### Attr code format

```
attr = (styleBits << 16) | (bg << 8) | fg
```

`fg` and `bg` are xterm 256-color indices (0–255). 0 = terminal default.

Style bits (bitmask):

| Bit | Style     |
| --- | --------- |
| 1   | Bold      |
| 2   | Dim       |
| 4   | Italic    |
| 8   | Underline |
| 16  | Blink     |
| 32  | Invert    |
| 64  | Hidden    |

### Example attr codes

```ts
const plain = 0 // default fg/bg, no style
const boldCyan = (1 << 16) | 6 // bold, cyan fg (xterm 6)
const redOnBlue = (2 << 8) | 1 // bg=red(1), fg=blue(4) -- wait, see below
const dimGreen = (2 << 16) | 2 // dim, green fg (xterm 2)
```

---

## TerminalGuard

`TerminalGuard` manages terminal lifecycle: raw mode, alternate screen, cursor hide, and optional mouse/paste tracking.

```ts
const guard = new TerminalGuard() // no mouse
const guard = new TerminalGuard(true) // enable SGR mouse tracking + bracketed paste
```

Always call `guard.leave()` on exit to restore the terminal. The guard is RAII-style — if your process crashes, the Rust drop handler fires and restores the terminal automatically.

```ts
process.on('SIGINT', () => {
  guard.leave()
  process.exit(0)
})
```

---

## Renderer

```ts
const renderer = new Renderer(cols, rows)

renderer.render(buf) // diff buf against previous frame → ANSI to stdout
renderer.resize(cols, rows) // resize (resets front buffer for full redraw)
renderer.renderDiff(buf) // returns ANSI string instead of writing (for benchmarks)
renderer.writeRaw(str) // write raw bytes through Rust's stdout handle
```

`renderer.render()` is the hot path. Only changed cells are emitted. Calling it with an identical buffer is effectively a no-op.

---

## Terminal size

```ts
import { terminalSize } from 'ratatat'

const { cols, rows } = terminalSize()
```

Handle resize:

```ts
process.on('SIGWINCH', () => {
  const { cols, rows } = terminalSize()
  renderer.resize(cols, rows)
  buf = new Uint32Array(cols * rows * 2)
})
```

---

## Inline mode

Inline mode renders a fixed-height region below the current cursor, without taking over the full terminal.

```ts
import { createInlineLoop } from 'ratatat'

const loop = createInlineLoop(
  (buf, cols, rows, frame) => {
    // fill buf here — same u32 format
    buf.fill(0)
    const text = `frame ${frame}`
    for (let i = 0; i < text.length; i++) {
      const idx = (cols + i) * 2
      buf[idx] = text.codePointAt(i)!
      buf[idx + 1] = 6 // cyan
    }
  },
  {
    rows: 6, // reserve 6 rows below current cursor
    fps: 30,
    onExit: 'preserve', // or 'destroy'
  },
)

loop.start()

setTimeout(() => {
  loop.stop()
}, 5000)
```

---

## The harness pattern

For clean examples, use the `harness.ts` pattern (see `examples-raw/harness.ts`):

```ts
export function runExample(paint: InlinePaintFn, options?: InlineOptions) {
  const guard = new TerminalGuard(true)
  const loop = createInlineLoop(paint, options)

  const stop = () => {
    loop.stop()
    guard.leave()
    process.exit(0)
  }

  process.on('SIGINT', stop)
  loop.start()
}
```

---

## Next steps

- [Raw Buffer API deep dive](raw-buffer.md)
- [Examples](examples.md) — runnable raw-buffer demos
- [Rendering Modes](rendering-modes.md) — compare all three modes
