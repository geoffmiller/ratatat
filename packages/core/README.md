# @ratatat/core

Framework-agnostic terminal runtime for Ratatat.

This package contains:

- the native Rust diff engine bindings (`Renderer`, `TerminalGuard`, `terminalSize`)
- raw buffer primitives (`Cell`)
- input parsing (`InputParser`)
- runtime helpers (`RatatatApp`, `createInlineLoop`)

## Install

```bash
npm install @ratatat/core
```

## Usage

```ts
import { Renderer, TerminalGuard, Cell } from '@ratatat/core'
```

For higher-level React APIs, use [`@ratatat/react`](../react/README.md).
