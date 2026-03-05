# Ink Compatibility

Ratatat implements the full Ink public API. This document tracks coverage.

## API Parity

| Export | Status | Notes |
|---|---|---|
| `render()` | ✅ | Returns `{ rerender, unmount, waitUntilExit, app, input }` |
| `Box` | ✅ | Full Yoga layout props |
| `Text` | ✅ | `color`, `bold`, `italic`, `underline`, `strikethrough`, `dim`, `inverse` |
| `Newline` | ✅ | |
| `Spacer` | ✅ | |
| `Static` | ✅ | Append-only scrollback |
| `Transform` | ✅ | String transform applied to children text |
| `renderToString()` | ✅ | Synchronous headless rendering |
| `measureElement()` | ✅ | Returns `{ width, height }` after layout |
| `useApp()` | ✅ | `{ exit, quit }` |
| `useInput()` | ✅ | |
| `useFocus()` | ✅ | |
| `useFocusManager()` | ✅ | |
| `useStdin()` | ✅ | |
| `useStdout()` | ✅ | |
| `useStderr()` | ✅ | |
| `useBoxMetrics()` | ✅ | `{ width, height, left, top, hasMeasured }` |
| `useIsScreenReaderEnabled()` | ✅ | Stub — always returns `false` |
| `useCursor()` | ✅ | Stub — `setCursorPosition` is a no-op |

## Architectural Differences

Ratatat is **not** a pure JS reimplementation of Ink. It shares the same React reconciler and Yoga layout engine but replaces Ink's string-based renderer with a Rust diff engine.

| | Ink | Ratatat |
|---|---|---|
| Render output | String → `chalk` colorize → stdout | `Uint32Array` buffer → Rust diff → ANSI |
| Screen strategy | Inline cursor-up rewrite (`log-update`) | Alternate screen (`EnterAlternateScreen`) |
| `useStdout` writes | Intercepted inline during render | Buffered, flushed after app exits |
| `patchConsole` | Intercepts `console.log` inline | Not implemented (different architecture) |
| Screen reader | `AccessibilityContext` + `isScreenReaderEnabled` | Stub (`false`) |
| Cursor positioning | `CursorContext` + `log-update` integration | Stub (no-op) |

## compat-test Coverage

The `compat-test/` directory contains verbatim copies of Ink's example apps with only the import path changed (`../../src/index.js` → `../dist/index.js`). Zero other changes.

| Example | Status | Notes |
|---|---|---|
| borders | ✅ | |
| box-backgrounds | ✅ | |
| chat | ✅ | |
| concurrent-suspense | ✅ | `{concurrent:true}` option ignored (always concurrent) |
| counter | ✅ | |
| incremental-rendering | ✅ | `{incrementalRendering:true}` option ignored |
| justify-content | ✅ | |
| static | ✅ | |
| stress-test | ✅ | |
| suspense | ✅ | |
| terminal-resize | ✅ | `{patchConsole,exitOnCtrlC}` options ignored |
| use-focus | ✅ | |
| use-focus-with-id | ✅ | |
| use-input | ✅ | |
| use-stderr | ✅ | |
| use-stdout | ✅ | |
| use-transition | ✅ | |
| aria | ✅ | `aria-role`/`aria-state`/`aria-hidden` props silently ignored; `useIsScreenReaderEnabled` returns `false` |
| cursor-ime | ✅ | `useCursor` is a no-op stub; cursor positioning unsupported |
| select-input | ⏭ | External dep: `ink-select-input` |
| table | ⏭ | External dep: `@faker-js/faker` |
| router | ⏭ | External dep: `react-router` |
| subprocess-output | ⏭ | External deps |
| render-throttle | ⏭ | Needs `maxFps` option — Ratatat is event-driven |
| jest | ⏭ | Test harness example, not a runtime example |
