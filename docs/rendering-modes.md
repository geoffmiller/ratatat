# Rendering Modes

Ratatat has three rendering modes. Each has different trade-offs and a different API surface.

---

## React mode

**Use when:** you want a full TUI app — layouts, components, React state, hooks, focus management.

The default mode. Your app tree is rendered into a virtual Yoga layout, painted into a `Uint32Array` cell buffer, and diffed by the Rust engine every frame. Only changed cells are written to stdout.

```tsx
import { render, Box, Text } from 'ratatat'
import React from 'react'

render(<App />)
```

**What you get:**

- Full Yoga flexbox layout
- All React hooks (useState, useEffect, useRef, Suspense, etc.)
- Ratatat hooks (useInput, useMouse, usePaste, useTextInput, useFocus, useScrollable, ...)
- Focus cycling via Tab / Shift+Tab
- Alternate screen (full terminal takeover)
- Automatic resize handling (SIGWINCH)
- Ctrl+C exits cleanly

**Guides:** [Quickstart: React mode](quickstart-react.md) · [Components](components.md) · [Hooks](hooks.md)

---

## Raw-buffer mode

**Use when:** you want maximum performance or full manual control over every cell.

No React. No Yoga. You write directly into a `Uint32Array` each frame, and the Rust diff engine handles ANSI output.

```ts
import { Renderer, TerminalGuard, terminalSize } from 'ratatat'

const { cols, rows } = terminalSize()
const guard = new TerminalGuard()
const renderer = new Renderer(cols, rows)
const buf = new Uint32Array(cols * rows * 2)

const loop = setInterval(() => {
  buf.fill(0)
  // fill buf...
  renderer.render(buf)
}, 16)
```

**What you get:**

- Direct `Uint32Array` buffer writes
- Rust diff engine (minimal ANSI output)
- No layout overhead
- Full terminal takeover (same Rust RAII guard)
- Optional mouse/paste tracking via `new TerminalGuard(true)`

**Guides:** [Quickstart: Raw-buffer mode](quickstart-raw-buffer.md) · [Raw Buffer API](raw-buffer.md)

---

## Inline mode

**Use when:** you want to render a fixed-height region below the current cursor without taking over the whole terminal — e.g., a picker, status bar, or progress display embedded in shell output.

### Raw inline (no React)

```ts
import { createInlineLoop } from 'ratatat'

const loop = createInlineLoop(
  (buf, cols, rows, frame) => {
    buf.fill(0)
    // fill buf...
  },
  { rows: 6, fps: 30, onExit: 'preserve' },
)

loop.start()
```

`onExit: 'preserve'` (default) — content stays in scrollback when the loop stops.  
`onExit: 'destroy'` — content is cleared, terminal looks untouched.

### React inline

```tsx
import { renderInline } from 'ratatat'
import React from 'react'

const instance = renderInline(<Picker />, { rows: 8 })
await instance.waitUntilExit()
```

**What you get:**

- No alternate screen — normal terminal scrollback preserved
- Fixed-height rendering region
- Cursor positioning via CPR (always correct even after scroll)
- Optional React or raw-buffer paint function

**Guides:** [Raw Buffer API: Inline mode](raw-buffer.md)

---

## Comparison

|                     | React mode | Raw-buffer mode   | Inline mode     |
| ------------------- | ---------- | ----------------- | --------------- |
| Alternate screen    | ✅         | ✅                | ❌ (inline)     |
| Yoga layout         | ✅         | ❌                | optional        |
| React hooks         | ✅         | ❌                | optional        |
| Buffer control      | indirect   | direct            | direct          |
| Performance ceiling | ~80k ops/s | ~10k fps          | ~10k fps        |
| Use case            | TUI apps   | animations, games | pickers, status |
