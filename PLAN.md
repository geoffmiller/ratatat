# ratatat Bug-Fix Plan

## Summary of Changes

### src/cell.ts
- Change `Cell.pack()` return type from `number` to `[number, number]`
- Return `[charCode, attrCode]` tuple where:
  - `charCode = char.charCodeAt(0)`
  - `attrCode = (styles << 16) | (bg << 8) | fg`
- Keep `getChar(cell)`, `getFg(cell)`, `getBg(cell)`, `getStyles(cell)` — these become
  helper functions that read from the **attr slot** (except `getChar` which reads the char slot).
  Update parameter docs to clarify which slot each accepts.

### src/input.ts
- In `start()`: store the bound listener ref: `this._boundHandleData = this.handleData.bind(this)`
- Register with: `this.stdin.on('data', this._boundHandleData)`
- In `stop()`: remove with: `this.stdin.removeListener('data', this._boundHandleData!)`
- Add private field `private _boundHandleData: ((data: string) => void) | null = null`

### src/hooks.ts
- Replace `useEffect` dependency on `handler` with a stable ref pattern:
  1. `const handlerRef = useRef(handler)` — hold the latest handler
  2. `useEffect(() => { handlerRef.current = handler; })` — sync on every render (no dep, layout effect timing not needed)
  3. Replace the main `useEffect` with an empty dep array `[]` — subscribe once on mount
  4. Inside the stable effect, call `handlerRef.current(...)` instead of `handler(...)`

### src/app.ts
- Remove the `queueRender()` method entirely
- In `start()`: remove the call to `this.queueRender()`
- Keep `requestRender()` unchanged — this is the only render trigger
- Remove the `renderQueued` flag reset from `tick()` guard (keep the check in `requestRender`)
- The `private renderQueued: boolean` field remains (used by `requestRender` debounce)

### src/styles.ts
- Remove `'space-evenly'` from the `alignContent` union type in the `Styles` interface
- Add `'space-evenly': Yoga.JUSTIFY_SPACE_EVENLY` to the `justifyContent` map

### example.ts
- Fix `buffer.fill(spaceCell)` — `spaceCell` from new `Cell.pack()` is a tuple, not a number.
  Fill must be split: fill char slots with space charCode, attr slots with default attrs.
  Pattern: `for (let i=0; i < width*height; i++) { buffer[i*2] = 32; buffer[i*2+1] = 0; }`
- Fix message writing loop: change `buffer[2 * width + 5 + i]` → use both slots:
  ```ts
  const [ch, attr] = Cell.pack(msg[i], 15, 2, 1);
  buffer[(2 * width + 5 + i) * 2] = ch;
  buffer[(2 * width + 5 + i) * 2 + 1] = attr;
  ```
- Fix cursor cell: same pattern for `buffer[cursorY * width + cursorX]` →
  write to `buffer[(cursorY * width + cursorX) * 2]` and `...*2+1`

### benchmark/bench.ts
- Replace entirely with a diff-engine benchmark:
  - Import `Bench` from `tinybench`
  - Import `Renderer` from `../dist/index.js`
  - Benchmark `renderer.generate_diff()` with a large pre-filled back-buffer
  - Include two cases: empty buffer (no diff) and fully-changed buffer (max diff)

### src/lib.rs
- Delete the dead `pack()` helper function in the `#[cfg(test)]` module
- Gate `use std::io::{self, Write}` with `#[cfg(not(unix))]` to silence dead-import
  warnings on Unix builds (it's only used in the non-unix `write_posix` fallback)

### Cargo.toml
- Update `authors` field from `["LongYinan <lynweklm@gmail.com>"]` to the correct project author

### package.json
- Update `engines.node` from the legacy multi-range string to `">=18"`

---

## Agent Assignments

**File count**: 10 source files (cell.ts, app.ts, hooks.ts, styles.ts, input.ts, lib.rs, example.ts, bench.ts, Cargo.toml, package.json)

Per the heuristic (9–12 files = 3 agents), split as follows:

### Agent 1 — TypeScript Core (4 files)
Files: `src/cell.ts`, `src/input.ts`, `src/hooks.ts`, `src/app.ts`

These four are the tightest cluster of bugs. Cell.pack affects input/hooks
indirectly through example.ts. Assign together so the worker sees the
complete picture of the "cell contract" when writing tests.

### Agent 2 — TypeScript Peripheral (3 files)
Files: `src/styles.ts`, `example.ts`, `benchmark/bench.ts`

Styles is self-contained. Example.ts depends on the new Cell.pack tuple API
(must read Agent 1's output from the contract). Bench.ts needs Renderer from
dist/ — purely additive, no shared state.

### Agent 3 — Rust + Config (3 files)
Files: `src/lib.rs`, `Cargo.toml`, `package.json`

Rust cleanup and metadata fixes. Fully independent from TypeScript changes.
Can run in parallel with Agent 1 and 2.

**Integration order**: Agents 1, 2, 3 run in parallel. No integration step needed
(changes do not interact at runtime — Rust API is unchanged, TS types are additive
except the Cell.pack break which only affects example.ts handled by Agent 2).

---

## Test Strategy

All tests go in `__test__/` as `.spec.ts` files, run via `ava`.

### T1 — Cell.pack() tuple (Agent 1)
File: `__test__/cell.spec.ts`
- `Cell.pack('A', 1, 2, 3)` returns array of length 2
- Slot `[0]` equals `'A'.charCodeAt(0)` (65)
- Slot `[1]` encodes fg=1 in bits 7:0, bg=2 in bits 15:8, styles=3 in bits 23:16
- `Cell.pack(' ')` default attrs: `[0]` = 32, `[1]` = 0x00_FF_FF (fg=255, bg=255)
- `Cell.getChar(65)` returns `'A'` (char slot value)
- `Cell.getFg(0x010203)` returns 3 (low byte of attr)
- `Cell.getBg(0x010203)` returns 2
- `Cell.getStyles(0x010203)` returns 1

### T2 — example.ts compile check (Agent 2)
File: No dedicated unit test. TypeScript compilation (`tsc --noEmit`) covers this.
Verify example.ts compiles clean after Cell.pack API update.

### T3 — InputParser listener lifecycle (Agent 1)
File: `__test__/input.spec.ts`
- Create a mock readable stream
- Call `start()` — `listenerCount('data')` on the stream equals 1
- Call `stop()` — `listenerCount('data')` on the stream equals 0
- Verify `start()` → `stop()` → `start()` works (doesn't double-register)

### T4 — useInput stable subscription (Agent 1)
File: `__test__/hooks.spec.ts`
- Render a component using `useInput` with a mock handler
- Simulate a re-render (prop change unrelated to input)
- Verify `context.input.on` was called exactly once (not on every render)
- Verify the latest handler is always invoked (not the stale one from mount)

### T5 — app.ts event-driven only (Agent 1)
File: `__test__/app.spec.ts`
- After `start()`, no automatic `tick()` fires without `requestRender()`
- After `requestRender()`, `emit('render', ...)` fires exactly once
- After `requestRender()` while already queued, still fires only once

### T6 — alignContent type excludes 'space-evenly' (Agent 2)
File: Not a runtime test — TypeScript type test via `tsd` or compilation.
Verify `{ alignContent: 'space-evenly' }` causes a TypeScript type error
(i.e., tsc reports an error for that value).

### T7 — justifyContent 'space-evenly' maps correctly (Agent 2)
File: `__test__/styles.spec.ts`
- Call `applyStyles` on a mock Yoga node with `justifyContent: 'space-evenly'`
- Verify `setJustifyContent` was called with `Yoga.JUSTIFY_SPACE_EVENLY`

### T8 — Benchmark runs without error (Agent 2)
File: `benchmark/bench.ts` — smoke verified by running `node --import @oxc-node/core/register benchmark/bench.ts`
in CI; not a unit test. Verify `tinybench` table output is produced.

### T9 — Rust tests pass with zero warnings (Agent 3)
Verified by: `cargo test 2>&1 | grep -E "^warning|FAILED"`
- `test_diffing_engine_empty` passes
- `test_diffing_engine_single_char` passes
- Zero compiler warnings (no dead code, no unused imports)

### T10 — package.json engines (Agent 3)
File: `__test__/package.spec.ts` (or inline in an existing spec)
- Read `package.json`, verify `engines.node === ">=18"`
