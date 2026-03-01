# Ratatat: Implementation Milestones

This document breaks down the orchestration sequence for building the library. Sub-agents should be assigned to specific milestones in sequential order.

## Phase 1: The Metal (Low-Level Infrastructure)

**Goal:** Establish the boundary between Node.js and Rust. Be able to write characters to the screen at 60 FPS.

- [ ] Initialize `napi-rs` project in the Rust directory.
- [ ] Write the Rust diffing engine:
  - Takes a `&[u32]` (Back Buffer) and compares it with its internal `Vec<u32>` (Front Buffer).
  - Emits optimal ANSI escape sequences for differences.
  - Implements batched raw POSIX `write(1)` to stdout.
- [ ] Implement terminal Setup/Teardown mechanisms (Raw Mode, Alternate Screen, Hiding Cursor).
- [ ] Implement terminal resize detection (SIGWINCH handling or polling via ioctl).

## Phase 2: The Bridge (JS State and Game Loop)

**Goal:** Create the JavaScript game loop and the buffer manipulation utilities.

- [ ] Create the `Cell.pack` and `Cell.unpack` TypeScript implementations based on the Memory Protocol.
- [ ] Implement the async generic "Game Loop" tick. Updates must never block the main thread.
- [ ] Build a raw Input Parser (listening to `stdin` bytes) and mapping standard ANSI input sequences (arrows, mouse clicks, keys) to a generic JS Event bus.

## Phase 3: Layout Engine Integration (Yoga)

**Goal:** Abstract X/Y math away by implementing Flexbox.

- [ ] Add `yoga-layout` or `yoga-layout-prebuilt` dependency.
- [ ] Create wrappers to construct a Yoga node tree parallel to the UI state.
- [ ] Create the traversal function: Walk the Yoga specific node tree, get absolute boundaries, and fill the target cells in the `Uint32Array` based on the coordinates constraints.

## Phase 4: React Reconciler (The Developer Experience)

**Goal:** The final layer—allow developers to write standard React code.

- [ ] Setup `react-reconciler` package.
- [ ] Define the HostConfig (createInstance, appendChild, commitUpdate, etc.).
- [ ] Implement core components: `<Box>` (maps to a Yoga Node), `<Text>` (handles text wrapping within a Yoga Node bounds).
- [ ] Ensure Ink-compatibility API (prop names like `flexDirection`, `borderStyle`, `paddingX`, etc.).

## Phase 5: Polish & Optimizations

**Goal:** Edge cases, borders, unicode.

- [ ] Implement Box borders (drawing box-drawing characters based on Yoga bounds).
- [ ] Handle Text wrapping / truncation logic natively in JS before pushing space to the buffer.
- [ ] Double-width char / Emoji processing strategy (if not using 8-bit charset).
