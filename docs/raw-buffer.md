# Using Ratatat Without React

Ratatat's Rust diff engine is the core — React and Yoga are just one way to fill the buffer.

## The Contract

Every frame, you hand the Rust engine a `Uint32Array`:

```
Uint32Array(cols × rows × 2)  →  Rust diff  →  minimal ANSI → stdout
```

The engine compares your buffer against the previous frame and emits only the escape sequences needed to update what changed. That's the whole contract. How you fill the buffer is entirely up to you.

## Buffer Format

Each cell occupies **two consecutive `u32` slots**:

```
buffer[idx * 2]     = Unicode codepoint  (the character)
buffer[idx * 2 + 1] = attr code          = (styles << 16) | (bg << 8) | fg
```

Cell index for position `(x, y)`:

```ts
const idx = y * cols + x
```

Colors are **xterm 256-color** indices (0–255). Styles are a bitmask:

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

## Minimal Setup

```ts
import { Renderer, TerminalGuard } from 'ratatat'

const guard = new TerminalGuard() // enter alternate screen + raw mode
const { cols, rows } = guard.getSize()
const renderer = new Renderer(cols, rows) // Rust diff engine
const buf = new Uint32Array(cols * rows * 2)

function paint() {
  buf.fill(0) // clear — blank cell = charCode 0

  // Write 'H' in bright red at (5, 3)
  const idx = (3 * cols + 5) * 2
  buf[idx] = 'H'.charCodeAt(0)
  buf[idx + 1] = 196 /* red fg */ & 0xff // bg=0, styles=0

  renderer.render(buf) // diff + flush to stdout
}

setInterval(paint, 16) // ~60fps

process.on('SIGINT', () => {
  guard.leave()
  process.exit()
})
```

## The `setCell` Helper

Ratatat exports `Cell` from `dist/cell.js` for convenience:

```ts
import { Cell, StyleMasks } from 'ratatat'

const [charCode, attrCode] = Cell.pack('A', 196, 0, StyleMasks.BOLD)
buf[idx * 2] = charCode
buf[idx * 2 + 1] = attrCode
```

Or use the `setCell` utility from `examples-raw/harness.ts` (included in this repo):

```ts
import { setCell } from './examples-raw/harness.js'

setCell(buf, cols, x, y, 'A', 196, 0, StyleMasks.BOLD)
```

## Terminal Resize

```ts
process.on('SIGWINCH', () => {
  const { cols, rows } = guard.getSize()
  renderer.resize(cols, rows)
  buf = new Uint32Array(cols * rows * 2)
})
```

## Gotcha: Sparse Updates and the Diff Engine

The Rust diff engine only emits **changes** — cells that are identical to the previous frame produce no output. This is what makes it fast, but it has one consequence you must handle yourself:

**If you don't paint a cell this frame, the diff engine assumes it hasn't changed and leaves it alone.** It won't erase what was there before.

This matters for **sparse painters** — demos that only paint a waveform, a cursor, or a moving object each frame rather than filling every cell. Simply zero-filling the buffer isn't enough: a zero cell looks the same as a "no change" cell to the diff engine.

**Two patterns that work:**

**1. Paint every cell every frame** (fire, Conway's Life) — always safe, no extra bookkeeping. If your demo naturally fills the whole screen, do this.

```ts
// Zero-fill then repaint everything — diff engine handles the rest
buf.fill(0)
for (let y = 0; y < rows; y++) {
  for (let x = 0; x < cols; x++) {
    setCell(buf, cols, x, y, computeChar(x, y), computeColor(x, y))
  }
}
```

**2. Track painted cells, explicitly clear stale ones** (oscilloscope, sprites, cursors) — for demos that only paint a subset of cells each frame.

```ts
let prevPainted = new Set<number>()
let currPainted = new Set<number>()

function paintTracked(buf, cols, x, y, char, fg) {
  setCell(buf, cols, x, y, char, fg)
  currPainted.add(y * cols + x)
}

function clearStale(buf, cols) {
  for (const key of prevPainted) {
    if (!currPainted.has(key)) {
      // Write an explicit space — diff engine sees it as a change and erases
      setCell(buf, cols, key % cols, Math.floor(key / cols), ' ', 0)
    }
  }
}

// In your paint function:
currPainted = new Set()
// ... paint your sparse cells with paintTracked() ...
clearStale(buf, cols)
prevPainted = currPainted
```

See `examples-raw/scope.ts` for a full working example of this pattern.

**Also watch out for block-fill characters** (`█`, `▓`, `▒`, `░`). These paint the cell's **background color**, not just the foreground. With `bg=0` on a non-black terminal theme, they leave a colored smear that persists. Use foreground-only characters (`▪`, `·`, `│`, `─`) for anything that moves.

## The Harness

`examples-raw/harness.ts` wraps all the boilerplate into a single `createLoop` call:

```ts
import { createLoop } from './examples-raw/harness.js'

const loop = createLoop((buf, cols, rows, frame) => {
  // fill buf however you like — called every frame
}, 60 /* fps */)

loop.start()
```

The harness handles: `TerminalGuard`, `Renderer`, `Uint32Array`, `setInterval`, `SIGWINCH`, `SIGINT`, `Ctrl+C`.

## What You Can Hook In

Because the contract is just "fill a `Uint32Array`", any system that can write pixel data can drive Ratatat:

| Approach               | Example                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| **Direct math**        | Game of Life, plasma fire, matrix rain, plasma, raycasters (`examples-raw/`) |
| **Immediate-mode**     | Call `setCell` in a loop — no retained tree at all                           |
| **Custom scene graph** | Build your own retained tree, walk it to paint cells                         |
| **React (default)**    | `render(<App />)` — Yoga layout → reconciler → buffer                        |
| **Other VDOM**         | Preact, Solid, or any library that can produce a tree of positioned boxes    |
| **Game engine loop**   | `requestAnimationFrame`-style loop, write sprites directly                   |
| **Port existing TUI**  | Map ncurses/blessed `mvprintw(y, x, str)` calls to `setCell`                 |

The Rust engine doesn't know or care what filled the buffer. It just diffs.

## Examples

```bash
# Conway's Game of Life — no React, no Yoga
node --import @oxc-node/core/register examples-raw/conway.ts

# Doom-style plasma fire
node --import @oxc-node/core/register examples-raw/fire.ts

# Matrix digital rain
node --import @oxc-node/core/register examples-raw/matrix.ts

# Frame timing oscilloscope — Ratatat visualizing its own render loop
node --import @oxc-node/core/register examples-raw/jitter.ts

# Sine harmonic oscilloscope — 5 drifting harmonics + composite
node --import @oxc-node/core/register examples-raw/scope.ts

# Demoscene plasma — overlapping sine waves, full 256-color palette
node --import @oxc-node/core/register examples-raw/plasma.ts
```

## Color Reference

xterm 256-color quick reference:

- `0–15` — standard terminal colors (theme-dependent)
- `16–231` — 6×6×6 color cube: index = `16 + 36r + 6g + b` (r,g,b ∈ 0–5)
- `232–255` — grayscale ramp (232=near-black, 255=near-white)

Useful values:

- `0` = black, `15` = white (theme-dependent)
- `196` = bright red, `46` = bright green, `226` = bright yellow, `21` = blue
- `231` = white (color cube white, not theme), `232` = near-black
