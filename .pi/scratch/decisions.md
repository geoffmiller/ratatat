# Decisions — ratatat

## 2026-02-XX: alignContent: 'space-evenly' removed from type
**Context**: Yoga v1.x has no `ALIGN_SPACE_EVENLY` constant.
**Decision**: Removed from the type union. Callers get a TS error if they use it.
**Alternatives**: Map to nearest value (space-around) — rejected, silent wrong behavior is worse than a type error.

## 2026-02-XX: Render loop strategy — pure event-driven
**Context**: Original code had a 60fps `setInterval` polling loop.
**Decision**: Removed polling. `requestRender()` schedules a single tick via `setTimeout(..., 0)`. Coalesces multiple calls before the tick fires.
**Alternatives**: Keep 60fps loop — rejected, wastes CPU when nothing changes; event-driven is strictly better for a TUI library.

## 2026-02-XX: Cell.pack() returns [charCode, attrCode] tuple
**Context**: Original returned a single packed u32 which lost the char vs attr distinction.
**Decision**: Returns `[charCode, attrCode]` tuple. Breaking change accepted pre-1.0.
**Alternatives**: Keep single u32 — rejected, makes buffer layout opaque and error-prone.

## 2026-02-XX: resolveColor lives in styles.ts
**Context**: Color resolution needed by both reconciler (prop → style) and renderer (borderColor).
**Decision**: Single `resolveColor()` in `styles.ts`, imported by both.
**Alternatives**: In reconciler — rejected, renderer can't import from reconciler without a cycle.

## 2026-02-XX: useApp() returns { exit, quit }
**Context**: Ink uses `const { exit } = useApp()`. ratatat-native code used `app.quit()`.
**Decision**: `useApp()` returns both. `exit` is Ink-compat alias, `quit` is ratatat-native.
**Alternatives**: Return raw app — rejected, breaks every Ink example.

## 2026-03-01: FocusProvider + TabHandler wired in render()
**Context**: Tab/Shift+Tab need to trigger focusNext/focusPrevious. The focus context must be available to the input handler. Two options: (1) wire at the app level in render(), (2) require users to add a TabHandler themselves.
**Decision**: Wrap every app tree with `<FocusProvider><TabHandler>{element}</TabHandler></FocusProvider>` inside `render()`. Users get Tab focus cycling for free — same as Ink.
**Alternatives**: User-managed TabHandler — rejected, forces boilerplate in every app; defeats the point of a compatibility layer.

## 2026-03-01: test.serial for async act() + react-test-renderer tests
**Context**: Focus tests using async `act()` interfere with each other when run concurrently in AVA due to React's shared global scheduler state.
**Decision**: Use `test.serial` for all focus tests. Sync tests (Newline, Spacer) remain concurrent.
**Alternatives**: Separate file per test — rejected, unnecessary overhead. Disable concurrency globally — rejected, slows all tests.

## 2026-03-01: Static component required before public release
**Context**: ratatat goal is 100% Ink API parity for public release as a drop-in alternative.
**Decision**: `<Static>` must be implemented before release. It is the last missing Ink primitive.
**What it does**: Append-only scrollback — previously rendered items are never re-rendered or cleared. Used for streaming build output, test results, log tailing. Needs a separate render pass (static items → stdout above the TUI, dynamic UI stays at bottom).
**Status**: Deferred. Implement before cutting v1.0.
