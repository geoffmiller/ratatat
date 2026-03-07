# Ratatat Docs

Welcome to the Ratatat documentation.

Ratatat is a fast, Ink-compatible React TUI framework for Node.js, powered by a native Rust diff engine and Yoga Flexbox layout.

---

## Get started

- [Getting Started](getting-started.md) — install, choose a mode, run your first app
- [Quickstart: React mode](quickstart-react.md) — build a TUI app with React components
- [Quickstart: Raw-buffer mode](quickstart-raw-buffer.md) — drive the renderer directly, no React

---

## Reference

- [Components](components.md) — `Box`, `Text`, `Newline`, `Spacer`, `Static`, `Transform`, `Spinner`, `ProgressBar`
- [Hooks](hooks.md) — `useInput`, `usePaste`, `useMouse`, `useTextInput`, `useScrollable`, focus hooks, terminal hooks
- [Rendering Modes](rendering-modes.md) — React mode vs raw-buffer mode vs inline mode

---

## Guides

- [Examples](examples.md) — curated demo map with run commands
- [Distribution](distribution.md) — npm package usage + SEA binary builds
- [Troubleshooting](troubleshooting.md) — common TTY issues, raw mode, paste/mouse caveats

---

## Deep dives

- [Raw Buffer API](raw-buffer.md) — buffer contract, cell format, color encoding
- [Ink Compatibility](ink-compat.md) — API parity table + Ratatat-only extensions
- [Render Loop](render-loop.md) — why Ratatat uses a game-engine style loop
- [Architecture Decisions](decisions.md) — key design decisions with rationale

---

## Maintainer notes

See [README.md](README.md) for conventions, link style, and update checklist.
