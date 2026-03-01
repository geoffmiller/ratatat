# Contract

## Project Type
library

## Modules

| Module | File | Type | Responsibility |
|--------|------|------|----------------|
| Cell | src/cell.ts | pure | Cell encoding/decoding for the 2×u32 back-buffer format |
| InputParser | src/input.ts | I/O | Raw stdin parsing; emits `keydown`, `data`, `click`, `exit` |
| useInput | src/hooks.ts | glue | React hook; subscribes to InputParser with a stable ref pattern |
| RatatatApp | src/app.ts | I/O | Terminal lifecycle, back-buffer owner, event-driven render trigger |
| Styles / applyStyles | src/styles.ts | pure | Yoga node style application from the `Styles` type |
| example.ts | example.ts | I/O | Manual integration example using the public Cell API |
| bench.ts | benchmark/bench.ts | I/O | tinybench benchmark for the Rust diff engine |
| Renderer (Rust) | src/lib.rs | I/O | N-API Renderer struct; diff engine and terminal write |
| Cargo.toml | Cargo.toml | config | Rust package metadata |
| package.json | package.json | config | Node package metadata and scripts |

---

## Exports

### src/cell.ts

```typescript
export const Cell: {
  /**
   * Pack a cell into a [charCode, attrCode] tuple.
   * charCode = char.charCodeAt(0)
   * attrCode = (styles & 0xFF) << 16 | (bg & 0xFF) << 8 | (fg & 0xFF)
   *
   * Write to buffer as: buffer[idx*2] = charCode; buffer[idx*2+1] = attrCode
   */
  pack(char: string, fg?: number, bg?: number, styles?: number): [number, number];

  /** Read the char character from a raw char slot value (buffer[idx*2]) */
  getChar(charSlot: number): string;

  /** Read fg color from an attr slot value (buffer[idx*2+1]) — bits 7:0 */
  getFg(attrSlot: number): number;

  /** Read bg color from an attr slot value (buffer[idx*2+1]) — bits 15:8 */
  getBg(attrSlot: number): number;

  /** Read styles bitmask from an attr slot value (buffer[idx*2+1]) — bits 23:16 */
  getStyles(attrSlot: number): number;
}

export const StyleMasks: {
  BOLD: 1;
  DIM: 2;
  ITALIC: 4;
  UNDERLINE: 8;
  BLINK: 16;
  INVERT: 32;
  HIDDEN: 64;
  STRIKETHROUGH: 128;
}
```

**Encoding contract** (matches Rust `generate_diff` in `src/lib.rs`):
```
back_buffer[idx * 2]     = char_code     (Unicode codepoint, u32)
back_buffer[idx * 2 + 1] = attr_code     = (styles << 16) | (bg << 8) | fg
```

### src/input.ts

```typescript
export class InputParser extends EventEmitter {
  private _boundHandleData: ((data: string) => void) | null;

  constructor(stdin: NodeJS.ReadStream);

  /** Enters raw mode, resumes stdin, registers the bound data listener */
  start(): void;

  /**
   * Exits raw mode, pauses stdin, removes the exact bound listener
   * registered in start(). Safe to call multiple times.
   */
  stop(): void;

  // Events emitted:
  // 'keydown' (key: 'up' | 'down' | 'left' | 'right' | 'enter' | 'backspace')
  // 'data'    (data: string)  — printable characters, non-escape
  // 'click'   ({ x: number, y: number })
  // 'exit'    ()              — Ctrl+C
}
```

### src/hooks.ts

```typescript
export interface Key {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  return: boolean;
  backspace: boolean;
  delete: boolean;
}

export type InputHandler = (input: string, key: Key) => void;

export interface RatatatContextProps {
  app: RatatatApp;
  input: InputParser;
}

export const RatatatContext: React.Context<RatatatContextProps | null>;

/**
 * Subscribes to keyboard input. Uses a stable ref so the effect runs
 * exactly once (on mount) regardless of how often the component re-renders.
 * Always invokes the latest handler passed by the caller.
 */
export const useInput: (handler: InputHandler) => void;

/** Returns the RatatatApp instance from context */
export const useApp: () => RatatatApp;
```

### src/app.ts

```typescript
export class RatatatApp extends EventEmitter {
  constructor();

  /** Enters raw mode + alternate screen. Does NOT start any render loop. */
  start(): void;

  /** Exits raw mode + alternate screen. */
  stop(): void;

  /** Returns the shared Uint32Array back-buffer (width * height * 2 u32 cells). */
  getBuffer(): Uint32Array;

  /** Returns current terminal dimensions. */
  getSize(): { width: number; height: number };

  /**
   * Schedules a single render on the next Node.js tick.
   * Debounced: multiple calls before the tick fires result in exactly one render.
   * Emits: 'render' (buffer: Uint32Array, width: number, height: number)
   */
  requestRender(): void;

  // NO queueRender() — polling loop removed entirely
}
```

### src/styles.ts

```typescript
export type Styles = {
  // ... (all fields unchanged except):

  /**
   * 'space-evenly' is REMOVED — Yoga 1.x has no ALIGN_SPACE_EVENLY.
   */
  alignContent?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around';

  /**
   * 'space-evenly' is NOW INCLUDED — maps to Yoga.JUSTIFY_SPACE_EVENLY.
   */
  justifyContent?: 'flex-start' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly' | 'center';

  // ... all other fields unchanged
}

export const applyStyles: (node: YogaNode, style?: Styles, currentStyle?: Styles) => void;
```

### src/lib.rs (Rust / N-API)

```rust
// Public N-API surface is UNCHANGED.
// Internal cleanup only.
#[napi]
pub struct Renderer { pub width: u16, pub height: u16, ... }

#[napi]
impl Renderer {
    #[napi(constructor)]
    pub fn new(width: u16, height: u16) -> Self;

    #[napi]
    pub fn render(&mut self, back_buffer: Uint32Array);

    // generate_diff is pub (used by tests) but NOT #[napi]
    pub fn generate_diff(&mut self, back_buffer: &[u32]) -> String;
}
```

---

## JS/Module Exports

| Module | Export | Signature change? | Consumed By |
|--------|--------|-------------------|-------------|
| cell.ts | `Cell.pack` | **BREAKING**: `number` → `[number, number]` | example.ts |
| cell.ts | `Cell.getChar` | Param semantics clarified (char slot, not packed cell) | — |
| cell.ts | `Cell.getFg/getBg/getStyles` | Param semantics clarified (attr slot, not packed cell) | — |
| input.ts | `InputParser` | Internal: `_boundHandleData` field added | hooks.ts, example.ts |
| hooks.ts | `useInput` | Behavior change: subscribes once, not on every render | user components |
| app.ts | `RatatatApp` | `queueRender()` removed; `start()` no longer polls | hooks.ts, example.ts |
| styles.ts | `Styles` type | `alignContent` loses `'space-evenly'`; `justifyContent` gains it | reconciler/layout |

---

## Behaviors

### B1: Cell.pack() returns [charCode, attrCode] tuple

- **Before**: `Cell.pack('A', 1, 2, 3)` → `number` (single packed u32, wrong layout for Rust)
- **After**: `Cell.pack('A', fg=1, bg=2, styles=3)` → `[65, 0x030201]`
  - `tuple[0]` = `'A'.charCodeAt(0)` = 65
  - `tuple[1]` = `(3 << 16) | (2 << 8) | 1` = `0x030201`
- **Defaults**: `Cell.pack(' ')` → `[32, (0 << 16) | (255 << 8) | 255]` = `[32, 0x00FFFF]`
  - fg default = 255 (terminal default), bg default = 255 (terminal default), styles default = 0
- **Getter contract**: getters now accept the individual slot value, not a packed u32:
  - `Cell.getChar(65)` → `'A'`
  - `Cell.getFg(0x030201)` → `1` (bits 7:0)
  - `Cell.getBg(0x030201)` → `2` (bits 15:8)
  - `Cell.getStyles(0x030201)` → `3` (bits 23:16)

### B2: example.ts writes both buffer slots with correct (idx*2) indexing

- **Clear step**: Replace `buffer.fill(spaceCell)` with a manual loop:
  ```ts
  for (let i = 0; i < width * height; i++) {
    buffer[i * 2] = 32;       // space char code
    buffer[i * 2 + 1] = 0x00FFFF; // default fg=255, bg=255, styles=0
  }
  ```
  (Cannot use `Uint32Array.fill` with a tuple)
- **Message write loop**: Index is `(row * width + col) * 2` for the char slot, `+1` for attr:
  ```ts
  for (let i = 0; i < msg.length; i++) {
    const [ch, attr] = Cell.pack(msg[i], 15, 2, 1);
    const idx = (2 * width + 5 + i) * 2;
    buffer[idx] = ch;
    buffer[idx + 1] = attr;
  }
  ```
- **Cursor cell**: Same pattern:
  ```ts
  const [ch, attr] = Cell.pack('X', 1, 255, 1);
  const idx = (cursorY * width + cursorX) * 2;
  buffer[idx] = ch;
  buffer[idx + 1] = attr;
  ```

### B3: InputParser stores bound listener ref — removeListener actually removes it

- **On `start()`**:
  1. `this._boundHandleData = this.handleData.bind(this)`
  2. `this.stdin.on('data', this._boundHandleData)`
- **On `stop()`**:
  1. `if (this._boundHandleData) this.stdin.removeListener('data', this._boundHandleData)`
  2. `this._boundHandleData = null`
- **Edge case — stop() before start()**: `_boundHandleData` is null, guard prevents crash
- **Edge case — start() called twice**: Second call replaces `_boundHandleData`, potentially leaking first listener. Workers MAY add a guard `if (this._boundHandleData) return` to prevent double-start, but is not required by this contract.

### B4: useInput uses a ref to hold the latest handler — effect runs once on mount

- **Mount**:
  1. `const handlerRef = useRef<InputHandler>(handler)` — initialized with first handler
  2. `useEffect(() => { handlerRef.current = handler; })` — sync ref on every render (no dep array)
  3. `useEffect(() => { ... subscribe using handlerRef.current ... }, [context])` — runs once per context
- **Inside stable effect**: handlers call `handlerRef.current(...)` not the captured `handler`
- **Unmount**: cleanup in the stable effect's return function removes listeners from `context.input`
- **Re-render**: `handlerRef.current` is updated before render commits; next input event uses new handler
- **Edge case — context changes**: The stable effect re-runs (dep: `[context]`), re-subscribing with new input instance

### B5: app.ts start() does NOT call queueRender() — only requestRender() triggers renders

- **start()** calls only `TerminalSetup.enter()` and sets `this.isRunning = true`
- **No** `setTimeout` loop is initiated in `start()`
- **requestRender()**: If `!this.renderQueued && this.isRunning`, sets `renderQueued = true`, schedules `setTimeout(() => this.tick(), 0)`
- **tick()**: Resets `renderQueued = false`, emits `'render'`, calls `this.renderer.render(this.backBuffer)`
- **Multiple requestRender() calls**: Only one tick is scheduled (the `renderQueued` flag acts as a debounce)
- **Edge case — requestRender() after stop()**: `this.isRunning` is false, no tick scheduled

### B6: styles.ts alignContent type removes 'space-evenly' — map is complete for supported values

- **Type**: `alignContent?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around'`
- **Map keys** in `applyFlexStyles` match the type exactly:
  ```
  'flex-start'   → Yoga.ALIGN_FLEX_START
  'center'       → Yoga.ALIGN_CENTER
  'flex-end'     → Yoga.ALIGN_FLEX_END
  'space-between'→ Yoga.ALIGN_SPACE_BETWEEN
  'space-around' → Yoga.ALIGN_SPACE_AROUND
  'stretch'      → Yoga.ALIGN_STRETCH
  ```
- **No** `'space-evenly'` key in map or type

### B7: styles.ts justifyContent map adds 'space-evenly' → Yoga.JUSTIFY_SPACE_EVENLY

- **Type**: `justifyContent?: 'flex-start' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly' | 'center'`
- **Map keys** in `applyFlexStyles` after fix:
  ```
  'flex-start'   → Yoga.JUSTIFY_FLEX_START
  'center'       → Yoga.JUSTIFY_CENTER
  'flex-end'     → Yoga.JUSTIFY_FLEX_END
  'space-between'→ Yoga.JUSTIFY_SPACE_BETWEEN
  'space-around' → Yoga.JUSTIFY_SPACE_AROUND
  'space-evenly' → Yoga.JUSTIFY_SPACE_EVENLY    ← ADDED
  ```

### B8: benchmark/bench.ts replaced with diff-engine benchmark using tinybench + Renderer

- **Imports**: `Bench` from `tinybench`; `Renderer` from `../dist/index.js`
- **Setup**: Create a `Renderer(80, 24)` instance; allocate `back_buffer = new Uint32Array(80 * 24 * 2)`
- **Benchmark cases**:
  1. `'empty buffer - no diff'`: back_buffer all zeros, call `renderer.generate_diff(back_buffer)`, expect result = `"\x1b[0m"`
  2. `'full buffer - max diff'`: pre-fill back_buffer with valid char/attr pairs (e.g., 'A' at every cell), call `generate_diff` repeatedly (front_buffer drifts naturally)
- **Run**: `await b.run()` then `console.table(b.table())`
- **No** imports of `plus100` or any non-existent export

### B9: Rust lib.rs — dead pack() helper removed, unused imports fixed

- **Delete**: The `fn pack(ch: char, fg: u8, bg: u8, styles: u8) -> u64` function in `#[cfg(test)]`
  (it encodes to u64 using the old single-cell layout — not used by any test)
- **Gate io import**: Move `use std::io::{self, Write}` inside `#[cfg(not(unix))]` block, or
  annotate with `#[allow(unused_imports)]` only for the unix build.
  Preferred: move the import inside the `#[cfg(not(unix))]` fn body or into a cfg-gated module.
- **Existing tests remain**: `test_diffing_engine_empty` and `test_diffing_engine_single_char` are kept unchanged.

### B10: Cargo.toml author updated, package.json engines updated to ">=18"

- **Cargo.toml**: `authors = ["LongYinan <lynweklm@gmail.com>"]` → `authors = ["<project author>"]`
  (Workers should use the git config name/email: `git config user.name` and `git config user.email`)
- **package.json**: `"engines": { "node": ">=18" }`
  - Replaces the entire legacy multi-version range string

---

## File Dependencies

| File | Depends On | Reason |
|------|-----------|--------|
| example.ts | src/cell.ts (via dist/) | Uses Cell.pack — must use new tuple API |
| src/hooks.ts | src/input.ts, src/app.ts | Subscribes to InputParser, returns RatatatApp |
| src/app.ts | src/lib.rs (N-API) | Instantiates Renderer, calls renderer.render() |
| benchmark/bench.ts | src/lib.rs (via dist/) | Calls renderer.generate_diff() |
| src/styles.ts | yoga-layout-prebuilt | Reads Yoga.JUSTIFY_SPACE_EVENLY constant |

---

## Data Flow

```
User keypress → stdin 'data' event
  → InputParser.handleData() → emit('keydown'/'data')
    → useInput stable effect listener → handlerRef.current(input, key)
      → component setState()
        → React re-render → reconciler writes to backBuffer
          → app.requestRender()
            → setTimeout tick()
              → emit('render', buffer, w, h)
                → Renderer.render(buffer)
                  → generate_diff() → write_posix() → terminal output
```

---

## Tests

### Unit Tests

**T1 — cell.spec.ts** (pure module, must have unit tests)
- `Cell.pack('A', 1, 2, 3)` → length-2 array
- `result[0]` === 65 (charCodeAt of 'A')
- `result[1]` === `(3 << 16) | (2 << 8) | 1`
- `Cell.pack(' ')` → `[32, (0 << 16) | (255 << 8) | 255]`
- `Cell.getChar(65)` → `'A'`
- `Cell.getFg(0x030201)` → 1
- `Cell.getBg(0x030201)` → 2
- `Cell.getStyles(0x030201)` → 3

**T3 — input.spec.ts** (I/O module, integration test)
- Mock stdin (EventEmitter with setRawMode/resume/pause)
- `start()` → `listenerCount('data')` = 1
- `stop()` → `listenerCount('data')` = 0
- Start, stop, start sequence: exactly 1 listener after second start

**T4 — hooks.spec.ts** (glue module)
- Render with mock context (mock InputParser EventEmitter)
- Verify `input.on` called exactly once per context
- Re-render with new handler prop → `input.on` NOT called again
- Fire `'keydown'` event → latest handler called (not stale initial handler)

**T5 — app.spec.ts** (I/O module)
- Mock `TerminalSetup` and `Renderer`
- `start()` + wait 100ms → `emit('render')` NOT fired (no polling loop)
- `requestRender()` → `emit('render')` fires once on next tick
- Two `requestRender()` calls before tick → `emit('render')` fires exactly once

**T7 — styles.spec.ts** (pure module)
- Mock Yoga node with jest-style spy on `setJustifyContent`
- `applyStyles(node, { justifyContent: 'space-evenly' })` → spy called with `Yoga.JUSTIFY_SPACE_EVENLY`
- `applyStyles(node, { alignContent: 'space-around' })` → compiles without error
- TypeScript: `{ alignContent: 'space-evenly' }` assigned to `Styles` → tsc error (verified by compilation)

**T9 — Rust tests (cargo test)**
- `test_diffing_engine_empty` passes unchanged
- `test_diffing_engine_single_char` passes unchanged
- Zero warnings: `cargo test 2>&1 | grep "^warning"` → empty

**T10 — package.spec.ts**
- `import pkg from '../package.json'`
- `pkg.engines.node` === `">=18"`

### Smoke Tests
- `tsc --noEmit` passes on entire TypeScript project (catches example.ts + styles.ts type errors)
- `node --import @oxc-node/core/register benchmark/bench.ts` exits 0 and prints a table

---

## Constraints

- **No new runtime dependencies** — all fixes use existing imports
- **Yoga version locked at 1.x** — do not upgrade; ALIGN_SPACE_EVENLY does not exist in this version
- **Cell.pack is a breaking change** — accepted for pre-1.0; no compatibility shim needed
- **Rust N-API surface unchanged** — Renderer public API stays identical; only internal cleanup
- **Node.js >=18** required (uses ESM, Uint32Array, modern Node APIs)
- **AVA test framework** — all test files follow AVA conventions (`import test from 'ava'`)
