# Getting Started

Ratatat supports three runtime modes.

| Mode            | Primary API                         | Import path                        | Best for                                         |
| --------------- | ----------------------------------- | ---------------------------------- | ------------------------------------------------ |
| React mode      | `render(<App />)`                   | `@ratatat/react`                   | Component-driven TUIs with hooks and Yoga layout |
| Raw-buffer mode | `Renderer` + `renderer.render`      | `@ratatat/core`                    | Direct per-cell rendering and custom loops       |
| Inline mode     | `renderInline` / `createInlineLoop` | `@ratatat/react` / `@ratatat/core` | Fixed-height UI below the cursor                 |

---

## Install

### React apps (most users)

```bash
npm install @ratatat/react react
```

### Raw-buffer / non-React apps

```bash
npm install @ratatat/core
```

> `@ratatat/core` is a TypeScript-facing runtime with a native Rust diff/render engine.

### ink-fast research fork

```bash
npm install @ratatat/ink react
```

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
+ import { render, Box, Text } from '@ratatat/react'
```

Most app-level API usage maps directly. See [Ink Compatibility](ink-compat.md) for caveats and stubs.

---

## Next steps

- [Package Map](package-map.md)
- [Quickstart: React mode](quickstart-react.md)
- [Quickstart: Raw-buffer mode](quickstart-raw-buffer.md)
