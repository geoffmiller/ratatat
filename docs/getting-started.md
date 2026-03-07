# Getting Started

## Install

```bash
npm install ratatat
```

Ratatat ships with a prebuilt native addon for:

- macOS arm64 (Apple Silicon)
- macOS x64 (Intel)
- Linux x64
- Linux arm64
- Windows x64

No compiler required on these platforms.

> **Requirements:** Node.js ≥ 20, a real TTY (Terminal.app, iTerm, Ghostty, etc.)

---

## Choose a mode

Ratatat has two primary usage modes. Pick the one that fits your use case.

|                | React mode                                            | Raw-buffer mode                                         |
| -------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| **What it is** | Build TUI apps with React components and hooks        | Drive the Rust renderer directly with a `Uint32Array`   |
| **Use when**   | You want layouts, components, state, focus management | You want max performance or full manual control         |
| **Key API**    | `render(<App />)`                                     | `new Renderer(w, h)` + `renderer.render(buf)`           |
| **Guide**      | [Quickstart: React mode](quickstart-react.md)         | [Quickstart: Raw-buffer mode](quickstart-raw-buffer.md) |

---

## Run the demos

Once installed, try the built-in examples:

```bash
# React mode
node --import @oxc-node/core/register examples/kitchen-sink.tsx
node --import @oxc-node/core/register examples/counter.tsx

# Raw-buffer mode (pure TypeScript, no JSX)
node --import @oxc-node/core/register examples-raw/matrix.ts
node --import @oxc-node/core/register examples-raw/conway.ts
```

See [Examples](examples.md) for a full list with descriptions.

---

## Ink users: migration

If you have an existing Ink app, migration is usually one line:

```diff
- import { render, Box, Text } from 'ink'
+ import { render, Box, Text } from 'ratatat'
```

See [Ink Compatibility](ink-compat.md) for full API coverage details.
