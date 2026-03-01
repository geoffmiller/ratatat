# ratatat Discovery

## Project Type
Library — a React+Yoga layout TUI renderer with a Rust/NAPI native backend for diffing and terminal output. TypeScript orchestrates layout and React reconciliation; Rust handles the diff-and-draw hot path via a shared `Uint32Array` back-buffer.

---

## Confirmed Bug Analysis

### CRITICAL: Cell.pack() layout mismatch (Issue #1)
`Cell.pack()` in `cell.ts` encodes everything into **one u32**:
```
[31..24 styles] [23..16 bg] [15..8 fg] [7..0 char]
```
But `renderer.ts` and the Rust renderer both already use **2×u32 interleaved**:
- `buffer[idx]   = char_code`
- `buffer[idx+1] = attr_code = (styles<<16) | (bg<<8) | fg`

`Cell.pack()` is only called from `example.ts` (which also uses the old 1×u32 buffer indexing: `buffer[2 * width + 5 + i]` instead of `buffer[(2 * width + 5 + i) * 2]`).

`renderer.ts` (`renderTreeToBuffer`) already uses the correct 2×u32 layout internally. So `Cell.pack()` is only broken *as a public API* — the React path through `renderer.ts` is fine.

**Fix is clear**: update `Cell.pack()` to write two values (or split into `Cell.writeChar`/`Cell.writeAttr`), and fix `example.ts` indexing. No user decision needed on *how* — the Rust contract is authoritative.

### CRITICAL: InputParser.stop() listener leak (Issue #2)
`removeListener('data', this.handleData.bind(this))` creates a new function reference. The original bound ref from `start()` is never stored, so the listener is never actually removed.

**Fix is clear**: store the bound ref in `start()` and use it in `stop()`.

### MEDIUM: useInput() re-subscribes on every render (Issue #3)
`useEffect` depends on `[context, handler]`. `handler` is a new closure ref each render. No `useCallback` or ref-stabilization used. This causes subscribe/unsubscribe on every render cycle.

**Fix is clear**: use a stable ref pattern (`useRef` holding latest handler, stable wrapper function). No user input needed.

### MEDIUM: `space-evenly` missing in styles maps (Issues #4, #5)
`justifyContent` map is missing `'space-evenly'` → `Yoga.JUSTIFY_SPACE_EVENLY` (confirmed present in yoga-layout-prebuilt).
`alignContent` map is missing `'space-evenly'` — BUT `Yoga.ALIGN_SPACE_EVENLY` does **not exist** in the installed `yoga-layout-prebuilt@1.x` type definitions. Only `ALIGN_SPACE_BETWEEN` and `ALIGN_SPACE_AROUND` are available for align.

**Decision needed — see Decision #1 below.**

### MEDIUM: Dual render loop in app.ts (Issue #6)
`queueRender()` fires `tick()` every ~16ms unconditionally (60fps polling loop) AND `requestRender()` fires an additional `tick()` on demand via `setTimeout(..., 0)`. Both paths call `tick()` which calls `emit('render', ...)`. So on a keypress, React renders *twice* — once from the event and once 0–16ms later from the loop.

**Decision needed — see Decision #2 below.**

---

## Key Decisions Needing User Input

### Decision #1: `alignContent: 'space-evenly'` — remove from type or map to best approximation?

**Context**: The `Styles` TypeScript type lists `'space-evenly'` as a valid value for `alignContent`. But the installed `yoga-layout-prebuilt@1.x` has no `ALIGN_SPACE_EVENLY` constant (only `JUSTIFY_SPACE_EVENLY` exists for `justifyContent`). The map silently ignores the value, leaving the Yoga node at its default.

**Options**:
- **A** (recommended): Remove `'space-evenly'` from the `alignContent` type entirely — it's unsupported by this Yoga version and silently broken is worse than a type error.
- **B**: Map it to `ALIGN_SPACE_AROUND` as the closest approximation and add a comment.
- **C**: Leave the type and add a runtime warning (bad for a library).

**Proposed default**: Option A — remove from type. The type is the public API contract; advertising something that silently does nothing is a footgun.

---

### Decision #2: Render loop strategy — pure event-driven or keep 60fps polling?

**Context**: `app.ts` has two rendering paths running in parallel: a `queueRender()` loop that fires every ~16ms regardless of state, and a `requestRender()` that fires on-demand. The polling loop was likely added as a development convenience ("proves 60fps renders are smooth") but causes redundant renders and means the `emit('render')` callback fires constantly even when nothing changed.

**Options**:
- **A** (recommended): Remove `queueRender()` entirely. Keep only `requestRender()`. Callers (React reconciler, input events) explicitly trigger renders when state changes. This is the Ink/Blessed pattern and avoids busy-looping.
- **B**: Keep both but add a dirty-flag so the polling loop only calls `tick()` when content has changed since last frame.
- **C**: Keep the polling loop, remove `requestRender()` (go full game-loop model).

**Proposed default**: Option A — event-driven only. This library wraps React; React already knows when to re-render. A polling loop fights that model and burns CPU doing nothing.

---

### Decision #3: `Cell` public API after the pack() fix — single-value or two-value?

**Context**: `Cell.pack()` is the only public TypeScript API for writing cells directly to the buffer (used in `example.ts` and potentially by library consumers who read the README). After the fix, a single cell requires writing 2 u32 values at 2 adjacent buffer slots. There are two natural API shapes:

**Options**:
- **A** (recommended): Keep `Cell.pack()` but change the signature so it returns `[charCode: number, attrCode: number]` (a tuple), and let callers write both. Update `example.ts` accordingly.
- **B**: Keep `Cell.pack()` returning a single packed u32 (for the old 1-slot model) and add a new `Cell.write(buffer, index, ...)` helper that writes both slots correctly. This avoids a breaking change if anyone has already used the old API.
- **C**: Delete `Cell` entirely — `renderer.ts`'s internal logic never uses it, and direct buffer manipulation is an escape hatch for power users only.

**Proposed default**: Option A — `Cell.pack()` returns a `[number, number]` tuple. It's explicit, composable, and makes the 2-slot contract visible at the call site. Breaking change is acceptable since this is pre-1.0.

---

### Decision #4: Benchmark file — fix or delete?

**Context**: `benchmark/bench.ts` imports `plus100` from `../index.js` — a function that no longer exists (template artifact). It will throw at runtime if anyone runs `npm run bench`.

**Options**:
- **A**: Delete the benchmark entirely — it's a leftover template artifact with no value for a TUI library.
- **B**: Replace with a meaningful benchmark — e.g., bench the Rust `generate_diff` against a JavaScript equivalent, or bench `renderTreeToBuffer` with a large layout tree.
- **C**: Fix the import to something that exists (e.g., `Renderer`) and write a minimal diff-engine benchmark.

**Proposed default**: Option B — replace with a real benchmark. The infrastructure is already there (tinybench, the bench script in package.json). A diff-engine benchmark would be genuinely useful for regression detection. But if the goal is just "fix the bugs and ship," Option A is fine.

---

## Items That Don't Need User Input (will just fix)

| Issue | Fix |
|-------|-----|
| #1 Cell.pack() layout | Update to return `[charCode, attrCode]` tuple (or per Decision #3) |
| #2 InputParser listener leak | Store bound ref in `start()`, reuse in `stop()` |
| #3 useInput re-subscribe | Stable ref pattern with `useRef` |
| #6 Dual render loop | Per Decision #2 |
| #8 Dead pack() in Rust tests | Delete or update the test helper |
| #9 Unused imports in lib.rs | Remove `use std::io::{self, Write}` (only used on non-unix fallback) — or gate with `#[cfg(not(unix))]` |
| #10 package.json engines | Update to `"node": ">=18"` |
| #11 Cargo.toml author | Update to correct author info |

## Answers
1. A — Remove 'space-evenly' from alignContent type entirely
2. A — Remove polling loop, pure event-driven via requestRender() only
3. A — Cell.pack() returns [charCode, attrCode] tuple (breaking change accepted, pre-1.0)
4. B — Replace benchmark with a real Rust diff-engine benchmark using tinybench
