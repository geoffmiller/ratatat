# Ratatat: Architecture Overview

## Mission

To build the fastest Node.js Terminal User Interface (TUI) library by combining the developer experience of React/Ink with the raw performance of Rust and N-API.

## The Core Problem

Current Node.js TUI libraries (like Ink) rely on heavy string manipulation in V8 and standard Node.js file I/O (`process.stdout`). This overhead leads to garbage collection spikes, event loop blocking, and rendering bottlenecks, making 60 FPS smooth UIs nearly impossible.

## The Proposed Architecture

Ratatat implements a completely new rendering paradigm for Node.jsTUIs: **Shared Memory + Native Rust Rendering**.

### 1. Shared Memory (`Uint32Array`)

The entire terminal screen state is represented as a single, flat `ArrayBuffer` in JavaScript. Every terminal cell is compressed into a single 32-bit integer.

- **Zero-copy:** A pointer to this buffer is passed directly to Rust via N-API, meaning no serialization/deserialization overhead.

### 2. Native Renderer (Rust + N-API)

A Rust native addon acts as the core diffing and rendering engine.

- It maintains an internal "Front Buffer" (what is currently on the terminal).
- When a new frame needs rendering, it diffs the JavaScript "Back Buffer" against its Front Buffer.
- It generates highly-optimized ANSI escape sequences only for the changed cells.
- **The Metal:** It writes these ANSI sequences directly to the OS terminal file descriptor (stdin/stdout) via raw POSIX `write(1)` syscalls, completely bypassing Node.js streams.

### 3. Layout Engine (Yoga)

Flexbox layout calculations are inherently CPU-intensive. Ratatat delegates this to Meta's **Yoga** engine (C++).

- Yoga is integrated via N-API.
- The UI tree structure is parsed, sent to Yoga, and Yoga returns absolute X/Y coordinates to JavaScript.

### 4. React Frontend (Ink Compatibility)

To provide the excellent DX of existing tools, Ratatat implements a custom React Reconciler.

- Developers use familiar components: `<Box>`, `<Text>`, etc.
- The reconciler translates React tree updates into Yoga nodes for layout and writes the resulting characters/colors directly into the `Uint32Array` Buffer.

## Architectural Boundaries

```
[ Developer Code (React) ]
         │
[ React Reconciler (JS) ] ──────> [ Yoga Layout Engine (C++) ]
         │ (Writes to)
[ Shared Memory Buffer (Uint32Array) ]
         │ (Zero-copy pointer)
[ Rust Renderer (N-API) ]
         │ (Diffs & generates ANSI)
[ OS Terminal (Raw POSIX write) ]
```

## Guiding Principles for Sub-Agents

1. **Performance First:** Never allocate memory in rendering loops. No string concatenation in the JS hot path.
2. **Zero Dependency (where possible):** Avoid heavy JS dependencies. Rely on N-API/Rust for intensive tasks.
3. **Compatibility:** The public API should mirror Ink's API as closely as possible to allow easy migration for users.
