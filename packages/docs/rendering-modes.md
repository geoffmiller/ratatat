# Rendering Modes

Ratatat supports three runtime modes.

---

## React mode

Use when you want component-driven terminal apps with hooks and Yoga layout.

```tsx
import { render } from '@ratatat/react'

render(<App />)
```

What you get:

- React components + hooks
- Yoga flex layout
- Focus management (Tab/Shift+Tab)
- Alternate screen lifecycle
- Resize handling (`SIGWINCH`)

Guide: [Quickstart: React mode](quickstart-react.md)

---

## Raw-buffer mode

Use when you want direct control over every cell.

```ts
import { Renderer, TerminalGuard, terminalSize } from '@ratatat/core'

const { cols, rows } = terminalSize()
const guard = new TerminalGuard()
const renderer = new Renderer(cols, rows)
const buf = new Uint32Array(cols * rows * 2)

renderer.render(buf)
```

What you get:

- Direct `Uint32Array` painting
- Rust diff engine output
- No React/Yoga overhead
- Alternate screen lifecycle

Guide: [Quickstart: Raw-buffer mode](quickstart-raw-buffer.md)

---

## Inline mode

Use when you want a fixed-height region below the current cursor (no alternate screen takeover).

### `renderInline()`

```tsx
import { renderInline } from '@ratatat/react'

renderInline(<Picker />, { rows: 8, onExit: 'preserve' })
```

### `createInlineLoop()`

```ts
import { createInlineLoop } from '@ratatat/core'

const loop = createInlineLoop(
  (buf, cols, rows, frame) => {
    // paint frame
  },
  { rows: 8, fps: 30, onExit: 'preserve' },
)

loop.start()
```

Notes:

- Inline mode preserves normal scrollback behavior.
- `onExit: 'preserve'` keeps rendered lines; `onExit: 'destroy'` clears the region.
- Current implementation exits the process when the inline loop stops.

Guide: [Raw Buffer API](raw-buffer.md#inline-mode-raw-buffer)

---

## Quick comparison

| Capability        | React mode | Raw-buffer mode | Inline mode |
| ----------------- | ---------- | --------------- | ----------- |
| Alternate screen  | ✅         | ✅              | ❌          |
| Yoga layout       | ✅         | ❌              | optional    |
| React hooks       | ✅         | ❌              | optional    |
| Direct cell paint | indirect   | direct          | direct      |
