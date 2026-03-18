# Ratatat Docs

Ratatat is a TypeScript-first terminal UI stack with a Rust diff engine and optional React layer.

This docs set covers the full monorepo (`@ratatat/core`, `@ratatat/react`, `@ratatat/ink`).

---

## Start here

- [Package Map](package-map.md) — choose the right package for your use case
- [Getting Started](getting-started.md) — first-run setup and mode selection

---

## `@ratatat/react` docs

- [Quickstart: React mode](quickstart-react.md) — `render(<App />)` + components + hooks
- [Components](components.md) — `Box`, `Text`, `Static`, `Transform`, `Spinner`, `ProgressBar`
- [Hooks](hooks.md) — input, paste, mouse, focus, scrolling, terminal hooks
- [Rendering Modes](rendering-modes.md) — React vs raw-buffer vs inline
- [Ink Compatibility](ink-compat.md) — parity matrix and stubs

---

## `@ratatat/core` docs

- [Quickstart: Raw-buffer mode](quickstart-raw-buffer.md) — direct `Uint32Array` painting
- [Raw Buffer API](raw-buffer.md) — buffer contract and renderer primitives
- [TypeScript Buffer Guide](ts-buffer-guide.md) — indexing/packing patterns with ASCII diagrams

---

## Examples and operations

- [Examples](examples.md) — demo map with run commands
- [Troubleshooting](troubleshooting.md) — common TTY/input/render issues

---

## Performance and deep dives

- [Why Ink is slower on heavy redraws](why-is-ink-slow.md)
- [Ink performance plan](ink-performance-plan.md)
- [ink-fast implementation + benchmark snapshots](../ink/TECHNICAL-README.md)
- [Render loop deep dive](render-loop.md)
- [Renderer correctness hardening plan](renderer-correctness-plan.md)
- [Architecture Decisions](decisions.md)

---

## Maintainer notes

See [README.md](README.md) for docs conventions and ownership notes.
