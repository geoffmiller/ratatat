# Package Map

Ratatat is a multi-package workspace.

Use this page to decide which package to install and where each API lives.

## Quick choice

| If you want to…                                       | Use package      | Why                                                              |
| ----------------------------------------------------- | ---------------- | ---------------------------------------------------------------- |
| Build a React TUI with components and hooks           | `@ratatat/react` | Includes the React renderer and Ink-compatible API               |
| Paint terminal cells directly from a `Uint32Array`    | `@ratatat/core`  | Lowest-level runtime, direct control over render loop and buffer |
| Run or study the `ink-fast` fork and perf experiments | `@ratatat/ink`   | Standalone Ink fork + benchmark harnesses                        |
| Browse docs for all packages                          | `@ratatat/docs`  | Monorepo docs package (private)                                  |

---

## `@ratatat/core`

Framework-agnostic runtime backed by the Rust diff engine.

You write **TypeScript/JavaScript** APIs; the Rust layer is internal.

Primary exports:

- `Renderer`
- `TerminalGuard`
- `terminalSize`
- `Cell`, `StyleMasks`
- `InputParser`
- `RatatatApp`
- `createInlineLoop`

Install:

```bash
npm install @ratatat/core
```

---

## `@ratatat/react`

React adapter and Ink-compatible component/hook surface.

Depends on `@ratatat/core` for terminal output + native diffing.

Primary exports:

- `render`, `renderInline`, `renderToString`
- components: `Box`, `Text`, `Static`, `Transform`, `Spinner`, `ProgressBar`, `Newline`, `Spacer`
- hooks: `useInput`, `useApp`, `useFocus`, `useFocusManager`, `usePaste`, `useMouse`, `useScrollable`, `useTextInput`, etc.

Install:

```bash
npm install @ratatat/react react
```

---

## `@ratatat/ink`

Research/experimental package: the `ink-fast` fork.

Contains:

- forked Ink implementation
- benchmark suites
- profiling harnesses
- research notes and snapshots

Install:

```bash
npm install @ratatat/ink react
```

---

## `@ratatat/docs`

Private docs workspace package.

- not intended for npm publish/consumption
- source of truth for monorepo docs pages

---

## Related pages

- [Getting Started](getting-started.md)
- [Quickstart: React mode](quickstart-react.md)
- [Quickstart: Raw-buffer mode](quickstart-raw-buffer.md)
- [Rendering Modes](rendering-modes.md)
