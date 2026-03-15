# Phase 1 upstream patch plan (Ink repo)

Date: 2026-03-15

This is the practical implementation plan to carry the shared-cache spike into Ink itself.

## Why this patch

From `phase1-shared-cache-spike.md`:

- per-render cache misses in `Output` are avoidable because `Output` is recreated each frame,
- cache persistence reduces `output.get` time and improves render medians in our workload matrix.

## Minimal architecture change

### Current pattern (conceptual)

```ts
// renderer.ts
const output = new Output({ width, height })
renderNodeToOutput(node, output)
const result = output.get()
```

Each render creates a fresh `Output`, which also creates fresh caches.

### Proposed pattern

```ts
// renderer.ts
const output = new Output({ width, height, sharedCaches })
renderNodeToOutput(node, output)
const result = output.get()
```

Where `sharedCaches` is retained across frames for a given renderer instance/stdout.

## Proposed code changes (Ink source repo)

Draft patch file in this repo:

- `ink-fast/upstream-patches/ink-shared-output-caches.patch`

1. **`source/output.ts`**
   - Add optional constructor input: `sharedCaches?: OutputCaches`
   - If provided, set `this.caches = sharedCaches`
   - Keep default behavior unchanged when omitted

2. **`source/renderer.ts`**
   - Introduce persistent cache holder for interactive output path
   - Reuse the same `OutputCaches` object across frame renders
   - Keep static-output path behavior explicit (can share or isolate by design)

3. **Optional safety**
   - Add upper-bound strategy if cache growth becomes a concern:
     - max entries per map,
     - simple clear-on-threshold policy,
     - or LRU in later iteration.

## Validation plan

### Functional

- run existing Ink tests
- verify no rendering regressions across:
  - ANSI styles,
  - Unicode wide chars,
  - clipping,
  - static output,
  - resize handling

### Performance

- run Ink benchmark fixtures (or equivalent)
- compare before/after on:
  - dense redraw
  - sparse redraw
  - unicode-heavy redraw
- record:
  - render median/p95
  - `Output.get` median
  - cache miss rate if instrumentation available

## Rollout strategy

1. Land behind internal opt-in flag first (if maintainers prefer low risk)
2. Validate across multiple terminals/platforms
3. Enable by default once no regressions are observed

## Expected outcome

- lower repeated width/tokenization misses across frames
- improved `Output.get` cost, especially in dense redraw scenarios
- no API breakage for Ink users
