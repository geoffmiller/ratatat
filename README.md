![Ratatat logo](docs/ratatat-logo.png)

# Ratatat ([Ratatui](https://ratatui.rs) + [Ink](https://github.com/vadimdemedes/ink))

> 100% Vibe Coded — Fork Only, no PRs

An Ink compatible React reconciler for the terminal — write TUI apps with React components, powered by a native Rust diff engine and Yoga Flexbox.

**[Ink API Compatibility](docs/ink-compat.md)** · **[Architecture Decisions](docs/decisions.md)** · **[Render Loop](docs/render-loop.md)** · **[Raw Buffer API](docs/raw-buffer.md)**

![Ratatat stress test](docs/ratatat-stress-test.png)

![Ratatat Sierpinski demo](docs/ratatat-seirpinski-demo.png)

```tsx
import { render, Box, Text, useInput } from 'ratatat'
import React, { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  useInput((input, key) => {
    if (key.upArrow) setCount((c) => c + 1)
    if (key.downArrow) setCount((c) => c - 1)
  })
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Counter
      </Text>
      <Text>
        Count: <Text color="green">{count}</Text>
      </Text>
      <Text dim>↑↓ to change · Ctrl+C to exit</Text>
    </Box>
  )
}

render(<Counter />)
```

## Why Ratatat?

|                                | Ratatat      | Ink         | Speedup   |
| ------------------------------ | ------------ | ----------- | --------- |
| Initial mount (simple)         | 67,630 ops/s | 8,215 ops/s | **8.2×**  |
| Initial mount (complex)        | 41,253 ops/s | 1,421 ops/s | **29×**   |
| Rerender (simple)              | 95,175 ops/s | 8,095 ops/s | **11.8×** |
| Rerender (complex)             | 49,852 ops/s | 1,384 ops/s | **36×**   |
| p99 latency (complex rerender) | **23µs**     | 1,585µs     | **68×**   |

Stress test: **303 FPS** sustained on a 188×50 terminal (8,648 cells/frame), running indefinitely.

The speed comes from two architectural decisions:

1. **Native Rust diff engine** — compares `Uint32Array` cell buffers and emits minimal ANSI escape sequences. Zero JS allocations in the hot path.
2. **`prepareUpdate` short-circuits** — returns `null` when props are unchanged, so React skips `commitUpdate` for unmodified nodes entirely.

## Features

- **React 19** — full hooks support: `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`, `useTransition`, `Suspense`
- **Flexbox layout** — Yoga engine, same API as React Native / Ink
- **Box model** — borders (`single`, `double`, `round`, `bold`, `arrow`), padding, margin, gap
- **Text styling** — `color`, `backgroundColor`, `bold`, `italic`, `dim`, `underline`, 256-color, hex, rgb
- **Input handling** — `useInput`, `useStdin`, keyboard + special keys, bracketed paste
- **Mouse support** — `useMouse`, click, right-click, scroll wheel, modifier keys (Ratatat only)
- **`useTextInput`** — managed text input: cursor, backspace/delete, home/end, Ctrl+U/K/W, paste (Ratatat only)
- **Focus management** — `useFocus`, `useFocusManager`, Tab cycling
- **Terminal hooks** — `useWindowSize`, `useStdout`, `useStderr`
- **`useScrollable`** — built-in scrolling primitive (not in Ink); virtual viewport over any data, keyboard nav, `scrollBy`/`scrollToTop`/`scrollToBottom`
- **App lifecycle** — `useApp().exit()`, SIGWINCH resize, alternate screen, raw mode
- **Inline mode** — `renderInline()` renders below the cursor without clearing scrollback; `createInlineLoop` for raw buffer inline rendering
- **Ink-compatible API** — most Ink apps work with a one-line import change
- **React-free mode** — fill the `Uint32Array` buffer directly; no React, no Yoga needed. See [Raw Buffer API](docs/raw-buffer.md)

## Architecture

```
React components
      │  setState / props change
      ▼
React Reconciler (src/reconciler.ts)
  prepareUpdate → null if props unchanged (skips commitUpdate)
  commitUpdate  → applyStyles() to Yoga node
  resetAfterCommit → pendingCommit = true
      │
      ▼
Render loop (src/react.ts)
  setInterval at maxFps (default 60fps)
  polls pendingCommit flag → fires paintNow() when set
      │
      ▼
app.paintNow() (src/app.ts)
  ├── Yoga layout engine (src/layout.ts)
  │     calculateLayout() → x/y/width/height for every node
  ├── Buffer painter (src/renderer.ts)
  │     renderTreeToBuffer() → writes (charCode, attrCode) pairs into Uint32Array
  ├── onBeforeFlush listeners (optional)
  │     direct buffer painting: animated graphs, overlays, devtools FPS counter
  └── Rust diff engine (src/lib.rs, src/ansi.rs)
        compares front/back buffer → emits minimal ANSI escape sequences
              │
              ▼
        process.stdout
```

**Buffer format:** `Uint32Array` with `width × height × 2` elements.  
Cell at `(x, y)`: index `= (y × cols + x) × 2`

- `buffer[idx]` = Unicode codepoint (u32)
- `buffer[idx+1]` = `(styles << 16) | (bg << 8) | fg` (all u8)

## Installation

> Don't do this — for me only

```bash
npm install https://github.com/geoffmiller/ratatat/releases/latest/download/ratatat.tgz
```

Or pin to a specific version:

```bash
npm install https://github.com/geoffmiller/ratatat/releases/download/v0.1.0/ratatat.tgz
```

Or in `package.json`:

```json
"dependencies": {
  "ratatat": "https://github.com/geoffmiller/ratatat/releases/latest/download/ratatat.tgz"
}
```

Requires Node 20+. Prebuilt native binaries for macOS (arm64, x64), Linux (x64, arm64), and Windows (x64) are bundled in the release tarball.

## Usage

```bash
# Run an example
node --import @oxc-node/core/register examples/counter.tsx

# Or with tsx
npx tsx examples/counter.tsx
```

## Examples

```
examples/
  borders.tsx              — all border styles
  box-backgrounds.tsx      — background colors
  chat.tsx                 — scrolling message list
  concurrent-suspense.tsx  — concurrent rendering
  counter.tsx              — increment/decrement with arrow keys
  incremental-rendering.tsx — high-frequency partial updates (3 progress bars at ~60fps)
  justify-content.tsx      — flexbox alignment demo
  kitchen-sink.tsx         — all features in one app
  logo.tsx                 — animated Ratatat logo with direct buffer painting
  rattata.tsx              — fake AI coding assistant (Ratatat-themed demo)
  sierpinski.tsx           — React Fiber Sierpinski triangle (243 nodes, pulsing width)
  static.tsx               — <Static> append-only task log
  stress-test.tsx          — 300+ FPS full-terminal color animation
  suspense.tsx             — React Suspense with async data
  terminal-resize.tsx      — live window size display
  use-focus-with-id.tsx    — named focus groups
  use-focus.tsx            — focus management
  use-input.tsx            — keyboard input handling
  use-mouse.tsx            — useMouse + useTextInput + bracketed paste demo (Ratatat only)
  use-scrollable.tsx       — useScrollable hook isolation demo (Ratatat only)

examples-raw/              — React-free direct buffer painting (no Yoga, no reconciler)
  harness.ts               — minimal render loop (TerminalGuard + Renderer + setInterval)
  conway.ts                — Conway's Game of Life, 20fps, age-colored cells
  fire.ts                  — Doom-style plasma fire, 30fps, 256-color palette
  matrix.ts                — Matrix digital rain, age-based fade buffer
  jitter.ts                — frame timing oscilloscope — Ratatat visualizing its own render loop
  scope.ts                 — sine harmonic oscilloscope, 5 drifting harmonics + composite
  plasma.ts                — demoscene plasma: overlapping sine waves mapped to 256-color palette
  use-stderr.tsx           — writing to stderr
  use-stdout.tsx           — writing to stdout
  use-transition.tsx       — useTransition for non-blocking updates
```

## Package Size

Measured against Ink 5.x.

### What you download (tarball)

|                                       | Ratatat | Ink    |
| ------------------------------------- | ------- | ------ |
| Packed (single platform)              | 290 kB  | 113 kB |
| Packed (fat tarball, all 4 platforms) | ~2.4 MB | 113 kB |
| Unpacked                              | 770 kB  | 482 kB |
| Files                                 | 36      | 177    |
| Runtime deps                          | 7       | 25     |

Ratatat's tarball is larger because it includes a prebuilt native `.node` binary (~609 kB). The fat release tarball bundles all 4 platform binaries (macOS arm64/x64, Linux x64/arm64) so `npm install` works without a Rust toolchain.

### What gets installed (`node_modules`)

|                           | Ratatat                       | Ink                  |
| ------------------------- | ----------------------------- | -------------------- |
| Total `node_modules` size | **150 MB**                    | 438 MB               |
| Runtime dep count         | **7**                         | 25                   |
| Heaviest runtime dep      | `react-reconciler` 1.6 MB     | `es-toolkit` 12 MB   |
| Yoga                      | `yoga-layout-prebuilt` 664 kB | `yoga-layout` 296 kB |

Ratatat's installed footprint is **3× smaller** than Ink's. Ink pulls in a large ANSI string manipulation stack (`es-toolkit`, `chalk`, `slice-ansi`, `wrap-ansi`, `ansi-escapes`, etc.) because it does all terminal rendering in JS. Ratatat offloads that to the Rust layer, so none of those deps are needed.

### Why Ratatat's Yoga is larger

Ratatat uses `yoga-layout-prebuilt` v1 (native `.node` binding, 574 kB). Ink uses `yoga-layout` v3 (WASM binary, 118 kB). The v3 WASM build is smaller, but it requires ESM and top-level `await` — incompatible with Ratatat's CJS build output. Not worth migrating for a 370 kB difference when the Rust binary is already in the tarball.

### Runtime deps

| Ratatat                | Ink                        |
| ---------------------- | -------------------------- |
| `cli-boxes`            | `@alcalzone/ansi-tokenize` |
| `eventemitter3`        | `ansi-escapes`             |
| `events`               | `ansi-styles`              |
| `react`                | `auto-bind`                |
| `react-reconciler`     | `chalk`                    |
| `scheduler`            | `cli-boxes`                |
| `yoga-layout-prebuilt` | `cli-cursor`               |
|                        | `cli-truncate`             |
|                        | `code-excerpt`             |
|                        | `es-toolkit`               |
|                        | `indent-string`            |
|                        | `is-in-ci`                 |
|                        | `patch-console`            |
|                        | `react-reconciler`         |
|                        | `scheduler`                |
|                        | `signal-exit`              |
|                        | `slice-ansi`               |
|                        | `stack-utils`              |
|                        | `string-width`             |
|                        | `terminal-size`            |
|                        | `type-fest`                |
|                        | `widest-line`              |
|                        | `wrap-ansi`                |
|                        | `ws`                       |
|                        | `yoga-layout`              |

## API — copied from Ink

### `render(element, options?)`

Mount a React element into the terminal. Returns an Ink-compatible instance handle.

```tsx
const { rerender, unmount, waitUntilExit } = render(<App />)

// Options
render(<App />, {
  maxFps: 30, // target frames per second (default: 60)
})

// Re-render with new props
rerender(<App theme="dark" />)

// Programmatic unmount
unmount()

// Wait for exit (resolves when unmount() is called or app exits)
await waitUntilExit()
```

### `renderInline(element, options?)`

Render a React element inline — directly below the current cursor position, without switching to the alternate screen. Scrollback is preserved. Use this for pickers, prompts, progress bars, or anything that should coexist with existing terminal output.

```tsx
import { renderInline } from 'ratatat'

const { unmount, waitUntilExit } = renderInline(<Picker />, {
  rows: 12, // terminal rows to reserve (default: 10)
  fps: 30, // target frames per second (default: 60)
  onExit: 'destroy', // 'preserve' (default) or 'destroy'
})

// 'destroy' — picker UI vanishes on exit, clean terminal
// 'preserve' — rendered content stays in scrollback

await waitUntilExit()
console.log('Done!')
```

All hooks work in inline mode: `useInput`, `useApp`, `useFocus`, `useMouse`, `useTextInput`, etc.

### `createInlineLoop(paint, options?)`

Raw buffer version of inline rendering — no React, no Yoga. Same scrollback-preserving behavior.

```ts
import { createInlineLoop } from 'ratatat'
import { setCell } from './examples-raw/harness.js'

const loop = createInlineLoop(
  (buf, cols, rows, frame) => {
    const msg = 'hello inline'
    for (let i = 0; i < msg.length; i++) {
      setCell(buf, cols, i, 0, msg[i], 51) // cyan text
    }
  },
  {
    rows: 3,
    fps: 30,
    onExit: 'preserve',
  },
)

loop.start()
// loop.stop() to exit
```

### `<Box>`

Flexbox container. All Yoga layout props supported.

```tsx
<Box
  flexDirection="row" // 'row' | 'column' (default: 'row')
  justifyContent="space-between"
  alignItems="center"
  padding={1}
  paddingX={2}
  margin={1}
  gap={1}
  width={40}
  height="100%"
  borderStyle="round" // 'single'|'double'|'round'|'bold'|'arrow'
  borderColor="cyan"
>
  ...
</Box>
```

### `<Text>`

Inline text with optional styling.

```tsx
<Text
  color="green" // named, hex (#ff0000), rgb (rgb(255,0,0))
  backgroundColor="blue"
  bold
  italic
  dim
  underline
>
  Hello world
</Text>
```

### `<Newline>`

Inserts a line break inside a `<Text>` node.

```tsx
<Text>
  line one
  <Newline />
  line two
</Text>
```

### `<Spacer>`

Expands to fill available space in a flex container, pushing siblings apart.

```tsx
<Box>
  <Text>left</Text>
  <Spacer />
  <Text>right</Text>
</Box>
```

### `<Static>`

Append-only list — items are rendered once and never re-rendered. Use for streaming output (build logs, test results) where the history should be frozen and only new items added.

```tsx
<Static items={completedTasks}>
  {(task) => (
    <Box key={task.id}>
      <Text color={task.ok ? 'green' : 'red'}>{task.name}</Text>
    </Box>
  )}
</Static>
```

### Hooks

```tsx
// Input
useInput((input, key) => {
  if (key.return) { ... }
  if (key.escape) { ... }
  if (key.ctrl && input === 'c') { ... }
})

// App lifecycle
const { exit } = useApp()

// Terminal size
const { columns, rows } = useWindowSize()

// Focus
const { isFocused } = useFocus({ id: 'my-panel' })
const { focus } = useFocusManager()

// Stdout / stderr
const { write } = useStdout()
const { write } = useStderr()

// Scrollable viewport — Ratatat only
const scroll = useScrollable({ viewportHeight: 20, contentHeight: items.length })
// scroll.offset, scroll.atTop, scroll.atBottom
// scroll.scrollBy(n), scroll.scrollToTop(), scroll.scrollToBottom()
const visible = items.slice(scroll.offset, scroll.offset + 20)

// Mouse — Ratatat only
useMouse((e) => {
  if (e.button === 'left') { ... }      // left | right | middle | scrollUp | scrollDown
  // e.x, e.y, e.shift, e.ctrl, e.meta
})

// Text input — Ratatat only
const { value, cursor, setValue, clear } = useTextInput({
  initialValue: '',
  onSubmit: (v) => { ... },
  onChange: (v) => { ... },
  isActive: true,
})
```

## Benchmarks

Measured on Apple M1 Max, Node.js v23.3.0, 80×24 terminal. React pipeline includes reconciler → Yoga layout → buffer paint. Diff engine measures the Rust ANSI diff independently.

```
┌────────────────────────────────────────┬──────────┬──────────┬──────────┐
│ Benchmark                              │ ops/sec  │ avg (µs) │ p99 (µs) │
├────────────────────────────────────────┼──────────┼──────────┼──────────┤
│ mount + render (simple)                │  82,124  │   12.2   │   24.1   │
│ mount + render (complex, 3 panels)     │  44,428  │   22.5   │   29.8   │
│ rerender (simple, state change)        │  86,639  │   11.5   │   14.8   │
│ rerender (complex, state change)       │  43,201  │   23.1   │   32.2   │
│ diff: no changes (hot path)            │   7,701  │  130.4   │  152.9   │
│ diff: all 1,920 cells dirty            │  10,350  │   97.0   │  117.0   │
│ diff: 5% cells dirty (typical frame)   │   6,864  │  146.8   │  179.6   │
└────────────────────────────────────────┴──────────┴──────────┴──────────┘
```

Run: `npm run bench:ts`

## Development

```bash
npm run build      # Rust native add-on (napi-rs)
npm run build:ts   # TypeScript
npm test           # 209 tests
```

## License

MIT
