# Architecture Decisions

Key design decisions made during development, with rationale.

---

## Render loop: pure event-driven

Removed the original 60fps `setInterval` polling loop. `requestRender()` schedules a single tick via `setTimeout(..., 0)` and coalesces multiple calls before the tick fires. Wastes zero CPU when nothing changes — strictly better for a TUI library.

## Cell buffer: `[charCode, attrCode]` tuple

`Cell.pack()` returns a `[charCode, attrCode]` pair. An earlier design packed both into a single u32 which lost the char vs attr distinction and made buffer layout opaque.

## Color resolution in `styles.ts`

`resolveColor()` lives in `styles.ts` and is imported by both the reconciler and renderer. Putting it in the reconciler would create a circular dependency.

## `useApp()` returns `{ exit, quit }`

Ink uses `const { exit } = useApp()`. `exit` is the Ink-compat alias; `quit` is the ratatat-native name. Both call the same underlying `app.quit()`.

## FocusProvider + TabHandler wired inside `render()`

Every app tree is automatically wrapped with `<FocusProvider><TabHandler>`. Users get Tab/Shift+Tab focus cycling for free, matching Ink's behavior. The alternative (user-managed) forces boilerplate in every app.

## `yogaOwner` Map as authoritative parent registry

`child.parent` (a LayoutNode reference) and Yoga's internal parent tracking both drift during React batch commits. A module-level `yogaOwner = new Map<YogaNode, LayoutNode>()` is the single source of truth for which LayoutNode owns a given Yoga node. `child.parent` is kept in sync but treated as secondary.

## Yoga `insertChild` index clamped to `getChildCount()`

During React batch commits, the JS `children` array and Yoga's internal child list can diverge. We clamp: `safeIndex = Math.min(index, yogaNode.getChildCount())`. Yoga's "Child already has a parent" error is misleading — it's thrown for both OOB inserts and actual double-parent inserts.

## Yoga wasm call before JS bookkeeping

If `yogaNode.insertChild` throws, updating `this.children` first leaves JS state permanently desync'd. Rule: always mutate the external/wasm state first, update JS only on success.

## `yogaNode.free()` not called on destroy

Calling `free()` during React's per-node batch deletion corrupts adjacent wasm heap memory in siblings. Yoga nodes are reclaimed when the wasm module is GC'd at process exit. The leak is bounded by session duration and immaterial for TUI apps.

## stdout buffering during alternate screen

`useStdout`/`useStderr` writes are buffered in `RatatatApp.stdoutBuffer`/`stderrBuffer` while the alternate screen is active, then flushed after `stop()` restores the normal screen. This prevents TUI corruption. Ink uses a different approach (inline cursor-up rewrite via `log-update`) because it doesn't use an alternate screen.

## Both `setRawMode` calls required

`crossterm::enable_raw_mode()` sets OS terminal flags (affects how the kernel delivers keystrokes). Node's `stdin.setRawMode(true)` is a separate stream-layer switch that tells Node to not buffer or echo input. Both must be called independently — they are not redundant.

## Transform: collect-then-paint approach

`<Transform>` collects all descendant text via `collectText()`, applies the transform function, then paints the result as a flat string. This matches Ink's `squashTextNodes` semantics. The transform node's children are not recursed into — the transform takes full ownership of its subtree's output.

## `renderToString` uses `updateContainerSync` + `flushSyncWork`

Unlike `render()` which uses async concurrent mode, `renderToString` uses React's synchronous legacy-root APIs. This ensures the output reflects the committed state after a single synchronous render pass, matching what Ink's `renderToString` does.
