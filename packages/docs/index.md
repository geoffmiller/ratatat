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

- [Why Ink is slower on heavy redraws](why-is-ink-slow.md) — pipeline-level comparison with Ratatat
- [Ink performance plan](ink-performance-plan.md) — phased roadmap to speed up Ink without switching stacks
- [ink-fast research fork (implementation + benchmarks)](../ink/TECHNICAL-README.md) — PoC execution of the plan with measured results
- [Raw Buffer API](raw-buffer.md) — buffer contract and cell format
- [TypeScript Buffer Guide](ts-buffer-guide.md) — practical indexing/packing patterns with ASCII diagrams
- [Ink Compatibility](ink-compat.md) — parity matrix and stubs
- [Render Loop](render-loop.md) — polling loop design and scheduler behavior
- [Renderer Correctness Plan](renderer-correctness-plan.md) — xterm harness, wide-char correctness, synchronized output rollout
- [Architecture Decisions](decisions.md) — key implementation choices

---

## Maintainer notes

See [README.md](README.md) for docs conventions and update checklist.
