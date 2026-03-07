# Examples

All examples are in the repo. Run them with:

```bash
node --import @oxc-node/core/register examples/<name>.tsx
node --import @oxc-node/core/register examples-raw/<name>.ts
```

---

## React mode (`examples/`)

### Basics

| File                  | What it demonstrates                                                        |
| --------------------- | --------------------------------------------------------------------------- |
| `counter.tsx`         | `useState` + `useInput` — the minimal working app                           |
| `use-input.tsx`       | All key types: arrows, ctrl, meta, special keys                             |
| `borders.tsx`         | Every border style: `single`, `double`, `round`, `bold`, `arrow`, `classic` |
| `box-backgrounds.tsx` | Background colors, 256-color palette                                        |
| `justify-content.tsx` | Flexbox alignment: `flex-start`, `center`, `space-between`, etc.            |
| `terminal-resize.tsx` | `useWindowSize` — live terminal dimensions, handles SIGWINCH                |

### Input and interaction

| File                    | What it demonstrates                                               |
| ----------------------- | ------------------------------------------------------------------ |
| `use-focus.tsx`         | `useFocus` — highlight active component, Tab to cycle              |
| `use-focus-with-id.tsx` | Named focus groups, programmatic `focus(id)`                       |
| `use-mouse.tsx`         | `useMouse` — left/right/middle click, scroll events, modifier keys |
| `use-paste.tsx`         | `usePaste` — bracketed paste channel, active/inactive routing      |

### Layout and composition

| File                 | What it demonstrates                                     |
| -------------------- | -------------------------------------------------------- |
| `use-scrollable.tsx` | `useScrollable` — virtual scroll viewport                |
| `static.tsx`         | `<Static>` — append-only scrollback (completed task log) |
| `chat.tsx`           | Scrolling message list with `<Static>` + live input      |

### Components

| File               | What it demonstrates                                         |
| ------------------ | ------------------------------------------------------------ |
| `spinner.tsx`      | `<Spinner>` — animated Braille spinner, custom frames        |
| `progress-bar.tsx` | `<ProgressBar>` — live progress with percentage              |
| `kitchen-sink.tsx` | All features in one app — tabs, mouse, input, layout, static |

### Text and styling

| File             | What it demonstrates                |
| ---------------- | ----------------------------------- |
| `use-stdout.tsx` | `useStdout` — write outside the TUI |
| `use-stderr.tsx` | `useStderr` — write to stderr       |

### Async and React features

| File                        | What it demonstrates                                       |
| --------------------------- | ---------------------------------------------------------- |
| `suspense.tsx`              | React Suspense with async data                             |
| `concurrent-suspense.tsx`   | Concurrent rendering + Suspense                            |
| `use-transition.tsx`        | `useTransition` — non-blocking state updates               |
| `incremental-rendering.tsx` | High-frequency partial updates (3 progress bars at ~60fps) |
| `sierpinski.tsx`            | React Fiber benchmark: 243-node Sierpinski triangle        |

### Inline mode

| File                 | What it demonstrates                          |
| -------------------- | --------------------------------------------- |
| `inline-minimal.tsx` | Minimal inline rendering with React           |
| `inline-picker.tsx`  | Inline selection picker (no alternate screen) |

### Ratatat-only demos

| File              | What it demonstrates                                                  |
| ----------------- | --------------------------------------------------------------------- |
| `logo.tsx`        | Animated Ratatat logo with direct buffer painting via `onBeforeFlush` |
| `rattata.tsx`     | Themed fake AI coding assistant (uses `<Static>` + streaming text)    |
| `stress-test.tsx` | 300+ FPS full-terminal color animation                                |

---

## Raw-buffer mode (`examples-raw/`)

| File               | What it demonstrates                                                      |
| ------------------ | ------------------------------------------------------------------------- |
| `matrix.ts`        | Matrix digital rain — age-based fade buffer, per-column independent drops |
| `conway.ts`        | Conway's Game of Life — classic cellular automaton                        |
| `plasma.ts`        | Plasma effect — sine-wave color blending                                  |
| `fire.ts`          | Fire effect — upward propagation, cooling model                           |
| `jitter.ts`        | Noise jitter — per-cell random state                                      |
| `scope.ts`         | Oscilloscope waveform                                                     |
| `inline-picker.ts` | Raw-buffer inline picker (no React, no alternate screen)                  |

All raw-buffer examples use `examples-raw/harness.ts` for lifecycle management.

---

## Full demo binary

The kitchen-sink and stress-test examples are also available as prebuilt SEA binaries for macOS arm64.  
See [Distribution](distribution.md) for build instructions and safety guidance.
