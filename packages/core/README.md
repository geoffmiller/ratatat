# @ratatat/core

Low-level terminal runtime for Ratatat.

This package provides native rendering primitives, raw-buffer APIs, input parsing, and inline/fullscreen runtime helpers.

## Install

```bash
npm install @ratatat/core
```

## Quick start

```ts
import { Renderer, TerminalGuard, terminalSize } from '@ratatat/core'

const { cols, rows } = terminalSize()
const guard = new TerminalGuard()
const renderer = new Renderer(cols, rows)
const buf = new Uint32Array(cols * rows * 2)

// Paint one cyan cell at (0,0)
buf[0] = 'A'.codePointAt(0)!
buf[1] = 6

renderer.render(buf)

process.on('SIGINT', () => {
  guard.leave()
  process.exit(0)
})
```

## Main exports

- `Renderer`, `terminalSize`, `TerminalGuard`
- `Cell`, `StyleMasks`
- `InputParser`
- `RatatatApp`
- `createInlineLoop`

## Docs

- [Quickstart: Raw-buffer mode](../docs/quickstart-raw-buffer.md)
- [Raw Buffer API](../docs/raw-buffer.md)
- [TypeScript Buffer Guide](../docs/ts-buffer-guide.md)
- [Rendering Modes](../docs/rendering-modes.md)

For React components/hooks and Ink-compatible APIs, see [`@ratatat/react`](../react/README.md).
