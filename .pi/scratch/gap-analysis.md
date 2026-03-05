# Ink Compatibility Gap Analysis
_Last updated: 2026-03-04_

## Status Legend
- ✅ Done
- 🔧 In progress
- ⏭ Skipped (external dep / out of scope)
- ❌ Not started

---

## Public API Gaps

| Item | What it does | Effort | Status |
|---|---|---|---|
| `render()` return value (`rerender`, `unmount`, `waitUntilExit`) | Ink returns `{ rerender, unmount, waitUntilExit }` — ratatat returns `{ app, input }`. Hard break for any programmatic usage. | Medium | ✅ |
| `Transform` component | Applies a string transform function to rendered children (used by gradients, links, text effects in ecosystem packages) | Medium | ✅ |
| `renderToString()` | Renders to a string synchronously, no TTY needed. Used for testing and doc generation. | Medium | ✅ |
| `measureElement()` | Returns `{width, height}` of a Box ref after layout | Small | ✅ |
| `useBoxMetrics()` | Like measureElement but as a hook with live updates | Small | ✅ |
| `useIsScreenReaderEnabled()` | Returns `false` stub is sufficient | Trivial | ✅ |
| `useCursor()` | Screen cursor positioning — stub returning no-ops is probably fine | Small | ✅ |

---

## compat-test Coverage

| Example | Status | Blocker |
|---|---|---|
| borders | ✅ | |
| box-backgrounds | ✅ | |
| chat | ✅ | |
| concurrent-suspense | ✅ | |
| counter | ✅ | |
| incremental-rendering | ✅ | |
| justify-content | ✅ | |
| static | ✅ | |
| stress-test | ✅ | |
| suspense | ✅ | |
| terminal-resize | ✅ | |
| use-focus | ✅ | |
| use-focus-with-id | ✅ | |
| use-input | ✅ | |
| use-stderr | ✅ | |
| use-stdout | ✅ | |
| use-transition | ✅ | |
| aria | ✅ | `useIsScreenReaderEnabled` returns false stub |
| cursor-ime | ✅ | `useCursor` no-op stub added |
| select-input | ⏭ | External dep: `ink-select-input` |
| table | ⏭ | External dep: `@faker-js/faker` |
| router | ⏭ | External dep: `react-router` |
| subprocess-output | ⏭ | External deps |
| render-throttle | ⏭ | Needs `maxFps` option — Ratatat is event-driven |
| jest | ⏭ | Test harness example, not a runtime example |

---

## Priority Order
1. `render()` return value — `rerender`, `unmount`, `waitUntilExit`
2. `Transform` component
3. `renderToString()`
4. `measureElement` / `useBoxMetrics`
5. Stubs: `useIsScreenReaderEnabled`, `useCursor` (unblocks aria + cursor-ime compat examples)
