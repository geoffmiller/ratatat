# Ink Compatibility

> Part of the [Ratatat docs](index.md). See also: [Hooks](hooks.md) · [Components](components.md)

Ratatat implements the full Ink public API. This document tracks coverage.

## API Parity

| Export                       | Status | Notes                                                                              |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `render()`                   | ✅     | Returns `{ rerender, unmount, waitUntilExit, app, input }`                         |
| `Box`                        | ✅     | Full Yoga layout props                                                             |
| `Text`                       | ✅     | `color`, `bold`, `italic`, `underline`, `strikethrough`, `dim`, `inverse`          |
| `Newline`                    | ✅     |                                                                                    |
| `Spacer`                     | ✅     |                                                                                    |
| `Static`                     | ✅     | Append-only scrollback                                                             |
| `Transform`                  | ✅     | String transform applied to children text                                          |
| `renderToString()`           | ✅     | Synchronous headless rendering                                                     |
| `measureElement()`           | ✅     | Returns `{ width, height }` after layout                                           |
| `useApp()`                   | ✅     | `{ exit, quit }`                                                                   |
| `useInput()`                 | ✅     | Full key support: arrows, ctrl, meta, delete, pageUp/Down, home/end                |
| `usePaste()`                 | ✅     | Bracketed paste channel; falls back to `useInput` when no paste listener is active |
| `useFocus()`                 | ✅     |                                                                                    |
| `useFocusManager()`          | ✅     |                                                                                    |
| `useStdin()`                 | ✅     |                                                                                    |
| `useStdout()`                | ✅     |                                                                                    |
| `useStderr()`                | ✅     |                                                                                    |
| `useBoxMetrics()`            | ✅     | `{ width, height, left, top, hasMeasured }`                                        |
| `useIsScreenReaderEnabled()` | ✅     | Stub — always returns `false`                                                      |
| `useCursor()`                | ✅     | Stub — `setCursorPosition` is a no-op                                              |
| `useWindowSize()`            | ✅     | Terminal dimensions — `{ columns, rows }`                                          |

## Ratatat-Only API

These exports exist in Ratatat but have no Ink equivalent. They are safe to use in Ratatat-only code.

| Export                   | Description                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useScrollable(options)` | Built-in virtual scrolling. Returns `{ offset, atTop, atBottom, scrollBy, scrollToTop, scrollToBottom }`. Ink has no equivalent — users must implement scrolling manually. |
| `useMouse(handler)`      | Subscribe to mouse events: click, right-click, middle, scrollUp, scrollDown, with modifier flags (shift/ctrl/meta). Ink has no mouse support at all.                       |
| `useTextInput(options)`  | Managed text input with cursor, backspace/delete, home/end, Ctrl+U/K/W kill shortcuts, and bracketed paste. Returns `{ value, cursor, setValue, clear }`.                  |
| `useWindowSize()`        | Terminal dimensions — `{ columns, rows }`. Also in Ink's public API, listed here as well for discoverability.                                                              |
| `DevTools`               | Debug overlay (internal)                                                                                                                                                   |
| `RatatatApp`             | Core app instance — event emitter, paint loop, terminal lifecycle                                                                                                          |
| `InputParser`            | Raw stdin parser — key events, mouse events, bracketed paste, escape sequences                                                                                             |
| `LayoutNode`             | Yoga node wrapper — the render tree                                                                                                                                        |
| `RatatatReconciler`      | The React reconciler instance                                                                                                                                              |
| `RatatatContext`         | Internal context (app, input, stdout/stderr writers)                                                                                                                       |
| `renderTreeToBuffer`     | Paint a layout tree into a `Uint32Array` buffer                                                                                                                            |
| `StyleMasks`             | Bitmask constants for text attributes                                                                                                                                      |
| `TerminalGuard`          | RAII guard — enters/leaves alternate screen, raw mode, mouse tracking, and bracketed paste                                                                                 |

## Architectural Differences

Ratatat is **not** a pure JS reimplementation of Ink. It shares the same React reconciler and Yoga layout engine but replaces Ink's string-based renderer with a Rust diff engine.

|                    | Ink                                              | Ratatat                                   |
| ------------------ | ------------------------------------------------ | ----------------------------------------- |
| Render output      | String → `chalk` colorize → stdout               | `Uint32Array` buffer → Rust diff → ANSI   |
| Screen strategy    | Inline cursor-up rewrite (`log-update`)          | Alternate screen (`EnterAlternateScreen`) |
| `useStdout` writes | Intercepted inline during render                 | Buffered, flushed after app exits         |
| `patchConsole`     | Intercepts `console.log` inline                  | Not implemented (different architecture)  |
| Screen reader      | `AccessibilityContext` + `isScreenReaderEnabled` | Stub (`false`)                            |
| Cursor positioning | `CursorContext` + `log-update` integration       | Stub (no-op)                              |

## compat-test Coverage

The `compat-test/` directory contains verbatim copies of Ink's example apps with only the import path changed (`../../src/index.js` → `../dist/index.js`). Zero other changes.

| Example               | Status | Notes                                                                                                                                     |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| borders               | ✅     |                                                                                                                                           |
| box-backgrounds       | ✅     |                                                                                                                                           |
| chat                  | ✅     |                                                                                                                                           |
| concurrent-suspense   | ✅     | `{concurrent:true}` option ignored (always concurrent)                                                                                    |
| counter               | ✅     |                                                                                                                                           |
| incremental-rendering | ✅     | `{incrementalRendering:true}` option ignored                                                                                              |
| justify-content       | ✅     |                                                                                                                                           |
| static                | ✅     |                                                                                                                                           |
| stress-test           | ✅     |                                                                                                                                           |
| suspense              | ✅     |                                                                                                                                           |
| terminal-resize       | ✅     | `{patchConsole,exitOnCtrlC}` options ignored                                                                                              |
| use-focus             | ✅     |                                                                                                                                           |
| use-focus-with-id     | ✅     |                                                                                                                                           |
| use-input             | ✅     |                                                                                                                                           |
| use-stderr            | ✅     |                                                                                                                                           |
| use-stdout            | ✅     |                                                                                                                                           |
| use-transition        | ✅     |                                                                                                                                           |
| aria                  | ✅     | `aria-role`/`aria-state`/`aria-hidden` props silently ignored; `useIsScreenReaderEnabled` returns `false`                                 |
| cursor-ime            | ✅     | `useCursor` is a no-op stub; cursor positioning unsupported                                                                               |
| select-input          | ⏭     | External dep: `ink-select-input`; Ratatat has select-like picker patterns in `examples/kitchen-sink.tsx` and `examples/inline-picker.tsx` |
| table                 | ⏭     | External dep: `@faker-js/faker`                                                                                                           |
| router                | ⏭     | External dep: `react-router`                                                                                                              |
| subprocess-output     | ⏭     | External deps                                                                                                                             |
| render-throttle       | ⏭     | No compat-test file — `maxFps` option is supported but not covered by a compat example                                                    |
| jest                  | ⏭     | Test harness example, not a runtime example                                                                                               |
