# Ratatat Docs

Ratatat is a React terminal UI renderer with an Ink-compatible API, Yoga layout, and a native Rust diff engine.

---

## Get started

- [Getting Started](getting-started.md) — choose a mode and run first examples
- [Quickstart: React mode](quickstart-react.md) — `render(<App />)` with components and hooks
- [Quickstart: Raw-buffer mode](quickstart-raw-buffer.md) — direct `Uint32Array` painting

---

## Reference

- [Components](components.md) — `Box`, `Text`, `Newline`, `Spacer`, `Static`, `Transform`, `Spinner`, `ProgressBar`
- [Hooks](hooks.md) — input, paste, mouse, focus, scrolling, terminal hooks
- [Rendering Modes](rendering-modes.md) — React vs raw-buffer vs inline

---

## Guides

- [Examples](examples.md) — demo map with run commands
- [Troubleshooting](troubleshooting.md) — common TTY/input/render issues

---

## Deep dives

- [Raw Buffer API](raw-buffer.md) — buffer contract and cell format
- [Ink Compatibility](ink-compat.md) — parity matrix and stubs
- [Render Loop](render-loop.md) — polling loop design and scheduler behavior
- [Architecture Decisions](decisions.md) — key implementation choices

---

## Maintainer notes

See [README.md](README.md) for docs conventions and update checklist.
