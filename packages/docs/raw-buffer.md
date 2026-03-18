# Raw Buffer API

> Part of the [Ratatat docs](index.md). See also: [Quickstart: Raw-buffer mode](quickstart-raw-buffer.md) · [TypeScript Buffer Guide](ts-buffer-guide.md) · [Rendering Modes](rendering-modes.md)

Ratatat's Rust renderer accepts a `Uint32Array` back buffer and emits minimal ANSI updates.

You write TypeScript/JavaScript against `@ratatat/core`; the Rust layer is internal.

## Core contract

```text
Uint32Array(cols × rows × 2) -> Rust diff -> ANSI writes
```

You control how the buffer is filled.

---

## Buffer format

Each cell uses two `u32` values:

```text
buffer[idx * 2]     = Unicode codepoint
buffer[idx * 2 + 1] = attr code = (styles << 16) | (bg << 8) | fg
```

Cell index for `(x, y)`:

```ts
const idx = y * cols + x
```

- `fg` / `bg`: ANSI 256 color (`0-255`)
- style bits:

| Bit | Style         |
| --- | ------------- |
| 1   | Bold          |
| 2   | Dim           |
| 4   | Italic        |
| 8   | Underline     |
| 16  | Blink         |
| 32  | Invert        |
| 64  | Hidden        |
| 128 | Strikethrough |

---

## Minimal setup

```ts
import { Renderer, TerminalGuard, terminalSize } from '@ratatat/core'

const guard = new TerminalGuard()
const { cols, rows } = terminalSize()
const renderer = new Renderer(cols, rows)
let buf = new Uint32Array(cols * rows * 2)

function paint() {
  buf.fill(0)

  // 'H' at (5, 3), bright red fg
  const idx = (3 * cols + 5) * 2
  buf[idx] = 'H'.codePointAt(0)!
  buf[idx + 1] = 196

  renderer.render(buf)
}

const timer = setInterval(paint, 16)

process.on('SIGINT', () => {
  clearInterval(timer)
  guard.leave()
  process.exit(0)
})
```

---

## Convenience helpers

### `Cell.pack`

```ts
import { Cell, StyleMasks } from '@ratatat/core'

const [charCode, attrCode] = Cell.pack('A', 196, 0, StyleMasks.BOLD)
buf[idx * 2] = charCode
buf[idx * 2 + 1] = attrCode
```

### `setCell` helper from repo examples

```ts
import { setCell } from './examples-raw/harness.js'

setCell(buf, cols, x, y, 'A', 196, 0, 1) // 1 = bold style bit
```

---

## Resize handling

```ts
process.on('SIGWINCH', () => {
  const { cols, rows } = terminalSize()
  renderer.resize(cols, rows)
  buf = new Uint32Array(cols * rows * 2)
})
```

---

## Clearing strategy

Use one of these patterns per frame:

1. **Full clear + repaint**

```ts
buf.fill(0)
// repaint everything you want visible this frame
```

2. **Sparse updates with explicit stale clears**

Track previously painted cells and write spaces into cells that are no longer active.

This is useful for pointer/cursor/sprite style renderers.

---

## Character caveat

Block glyphs (`█`, `▓`, `▒`, `░`) can visually look like background fills.
For moving marks, narrow foreground glyphs (`▪`, `·`, `│`, `─`) are often easier to clear cleanly.

---

## Harness pattern in repo examples

`examples-raw/harness.ts` wraps common loop boilerplate (guard, renderer, resize, Ctrl+C):

```ts
import { createLoop } from './examples-raw/harness.js'

const loop = createLoop((buf, cols, rows, frame) => {
  // paint frame
}, 60)

loop.start()
```

---

## Inline mode: `createInlineLoop()`

`createInlineLoop` draws a fixed-height region below the current cursor, without alternate screen takeover.

```ts
import { createInlineLoop } from '@ratatat/core'

const loop = createInlineLoop(
  (buf, cols, rows, frame) => {
    buf.fill(0)
    const text = `frame ${frame}`
    for (let i = 0; i < text.length; i++) {
      const idx = i * 2
      buf[idx] = text.codePointAt(i)!
      buf[idx + 1] = 51
    }
  },
  { rows: 5, fps: 30, onExit: 'preserve' },
)

loop.start()
```

Options:

- `rows` (default `10`)
- `fps` (default `60`)
- `onExit: 'preserve' | 'destroy'`

Current behavior: stopping the inline loop exits the process.

---

## Example commands

```bash
node --import @oxc-node/core/register examples-raw/ascii-3d.ts
node --import @oxc-node/core/register examples-raw/conway.ts
node --import @oxc-node/core/register examples-raw/fire.ts
node --import @oxc-node/core/register examples-raw/matrix.ts
node --import @oxc-node/core/register examples-raw/jitter.ts
node --import @oxc-node/core/register examples-raw/scope.ts
node --import @oxc-node/core/register examples-raw/plasma.ts
node --import @oxc-node/core/register examples-raw/inline-picker.ts
```
