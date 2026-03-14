# Getting Started

Ratatat supports three runtime modes:

| Mode            | Primary API                         | Best for                                  |
| --------------- | ----------------------------------- | ----------------------------------------- |
| React mode      | `render(<App />)`                   | Component-driven TUIs with hooks and Yoga |
| Raw-buffer mode | `Renderer` + `renderer.render`      | Direct, per-cell rendering control        |
| Inline mode     | `renderInline` / `createInlineLoop` | Fixed-height UI below the cursor          |

---

## Requirements

- Node.js 20+
- A real TTY (Terminal.app, iTerm2, Ghostty, kitty, etc.)

---

## Run examples in this repository

```bash
# React mode
node --import @oxc-node/core/register examples/kitchen-sink.tsx
node --import @oxc-node/core/register examples/counter.tsx

# Raw-buffer mode
node --import @oxc-node/core/register examples-raw/matrix.ts
node --import @oxc-node/core/register examples-raw/conway.ts

# Inline mode (React)
node --import @oxc-node/core/register examples/inline-minimal.tsx
```

See [Examples](examples.md) for the full list.

---

## Ink migration (typical)

```diff
- import { render, Box, Text } from 'ink'
+ import { render, Box, Text } from 'ratatat'
```

Most app-level API usage maps directly. See [Ink Compatibility](ink-compat.md) for details and caveats.
