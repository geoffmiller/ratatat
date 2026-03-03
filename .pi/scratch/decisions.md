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

## 2026-03-01: Yoga node free() leak — pre-release fix required
**Context**: `layout.ts removeChild()` calls `yogaNode.removeChild()` but never calls `child.yogaNode.free()`. Yoga nodes are native heap allocations. Under high-frequency reconciliation (stress test, rapid state changes), this leaks native memory and may cause Yoga's internal accounting to give wrong layout results.
**Decision**: Deferred. `flexShrink={0}` on the stress test header masks the symptom. Must fix before release.
**Fix**: Call `child.yogaNode.free()` in `removeChild()` and add a `destroy()` method to `LayoutNode` that recursively frees all children. Wire it to reconciler's `detachDeletedInstance`.

## 2026-03-01: yogaOwner Map as authoritative parent registry
**Context**: `child.parent` (LayoutNode reference) and Yoga's internal parent tracking both drift during React batch commits. `child.parent` can be stale (parent was already updated but child wasn't), and `yogaNode.getParent()` returns a new proxy object each call whose identity doesn't match any LayoutNode.
**Decision**: Use a module-level `yogaOwner = new Map<YogaNode, LayoutNode>()` as the single authoritative source of which LayoutNode currently owns a given Yoga node. `child.parent` is kept in sync but treated as secondary.
**Alternatives**: Rely only on `child.parent` — rejected, goes stale in multi-insertion batches. Rely on `getParent()` proxy — rejected, proxy identity is unreliable across calls.

## 2026-03-01: Yoga insertChild index must be clamped to yogaNode.getChildCount()
**Context**: During React batch commits with multiple `insertBefore`/`appendChild` calls, the JS `children` array and Yoga's internal child list diverge. Each removal reduces Yoga's count, but our `indexOf(beforeChild)`-based index calculation operates on the JS array state — which may be ahead of or behind Yoga's actual state. Inserting at index > Yoga's current child count throws "Child already has a parent" (Yoga's misleading OOB error).
**Decision**: `safeIndex = Math.min(index, this.yogaNode.getChildCount())` applied to every Yoga insertChild call.
**Why the error is misleading**: Yoga's OOB insert and double-parent insert throw the same error string. Do not assume "Child already has a parent" means the node is still attached.

## 2026-03-01: Yoga insertChild — do wasm call before JS bookkeeping update
**Context**: If `yogaNode.insertChild` throws (any reason), updating `this.children.splice()` first leaves JS state permanently desync'd from Yoga state. All subsequent inserts into that parent will be off by one, cascading.
**Decision**: Call `this.yogaNode.insertChild(child.yogaNode, safeIndex)` FIRST. Only update `child.parent`, `this.children`, and `yogaOwner` AFTER the Yoga call succeeds. Wrap in try/catch; return early on failure.
**Rule**: Any time JS state must mirror an external/wasm state — always update the external state first. Update JS only on success.

## 2026-03-01: yogaNode.free() deferred — do not call in destroy()
**Context**: Original destroy() called yogaNode.free(). In isolation, freeing a yoga node after removing it from its parent works. But with React's batch commit pattern (detachDeletedInstance called per-node), freeing one node while siblings still reference adjacent wasm heap memory causes corruption — manifesting as "Child already has a parent" on nodes that were fine before.
**Decision**: Do NOT call yogaNode.free() in destroy(). Yoga nodes are reclaimed when the wasm module is GC'd at process exit. The "leak" is bounded by session duration and insignificant for TUI apps.
**Alternatives**: Defer free() to after the full commit batch — rejected, no clean hook for "after all deletions". Pool and reuse nodes — rejected, complexity not warranted pre-v1.

## 2026-03-01: Update GitHub URLs in package.json before publish
**Context**: package.json repository/homepage/bugs fields contain placeholder GitHub URLs.
**Decision**: Update to real URLs once the GitHub repo is created. Fields: `repository.url`, `homepage`, `bugs.url`.
**Status**: Blocked on repo creation. Do before `npm publish`.

## 2026-03-01: Brand name is "Ratatat" (capital R) everywhere except code
**Context**: The npm package name stays `ratatat` (lowercase, npm requirement). But all human-facing text — README, docs, comments, UI labels, release notes — should use "Ratatat" with a capital R.
**Decision**: Code identifiers stay as-is (`ratatat`, `render`, etc.). Prose and display text use "Ratatat".
**Status**: README and kitchen-sink header updated in this session.

## 2026-03-01: Compat test visual testing — in progress
**Tested and passing:**
- ✅ counter
- ✅ borders
- ✅ justify-content
- ✅ box-backgrounds
- ✅ use-input
- ✅ use-focus
- ✅ use-focus-with-id
- ✅ use-transition

**Still to test:**
```sh
node --import @oxc-node/core/register compat-test/chat.tsx
node --import @oxc-node/core/register compat-test/suspense.tsx
node --import @oxc-node/core/register compat-test/concurrent-suspense.tsx
node --import @oxc-node/core/register compat-test/static.tsx
node --import @oxc-node/core/register compat-test/incremental-rendering.tsx
node --import @oxc-node/core/register compat-test/terminal-resize.tsx
node --import @oxc-node/core/register compat-test/use-stdout.tsx
node --import @oxc-node/core/register compat-test/use-stderr.tsx
```
