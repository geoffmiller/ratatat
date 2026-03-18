# Renderer correctness plan (xterm harness → wide-char correctness → synchronized output)

This plan tracks the renderer hardening pass focused on terminal correctness before perf tuning.

## Goals

1. Add a terminal-accurate correctness harness (xterm-headless replay tests).
2. Fix wide character handling end-to-end (layout measure + raster + diff emission).
3. Add DEC 2026 synchronized output wrapping to reduce visual tearing.

## Why this order

1. **Harness first** gives us a regression net before touching risky rendering logic.
2. **Wide-char correctness second** addresses the largest known rendering correctness gap.
3. **DEC 2026 last** is lower risk and easier to validate once core rendering is stable.

## Phase 1 — xterm replay harness (P0)

### Deliverables

- Add xterm-backed replay test helper(s) under `__test__/`.
- Add deterministic round-trip tests:
  - render `backBufferA` → apply ANSI in xterm
  - render `backBufferB` diff → apply ANSI in same xterm
  - assert xterm viewport equals expected cells from `backBufferB`
- Add at least one property-ish randomized smoke test for ASCII cells.

### Acceptance criteria

- Tests pass in CI/local with deterministic seed.
- Failures report enough context to debug (row/col mismatch, sample output).

## Phase 2 — wide-char correctness (P0)

### Deliverables

- Width-aware text measurement in `src/layout.ts` (replace `.length` assumptions).
- Width-aware text rasterization in `src/renderer.ts`:
  - advance cursor by display width
  - emit continuation markers for occupied trailing cells
- Width-aware diff cursor progression in `src/lib.rs` so wide glyphs do not desync cursor assumptions.
- Targeted tests for CJK/emoji wrap/alignment and diff round-trip.

### Acceptance criteria

- CJK/emoji deterministic tests pass against xterm replay.
- No regressions in existing renderer/input/layout suites.

## Phase 3 — DEC 2026 synchronized output (P1)

### Deliverables

- Wrap frame writes in `\x1b[?2026h` / `\x1b[?2026l` in runtime render paths.
- Keep behavior noop-safe on terminals that ignore DEC 2026.
- Add tests to assert wrappers are emitted in frame output paths.

### Acceptance criteria

- Existing rendering behavior unchanged except wrapped frame output.
- Tests cover on/off wrappers and cursor visibility sequencing.

## Verification checklist

- [ ] `npm run build`
- [ ] `npm test`
- [ ] focused renderer tests (new + existing)
- [ ] docs updated if behavior/limitations changed

## Out of scope for this pass

- Full grapheme-cluster rendering for ZWJ sequences beyond single-codepoint width handling.
- Performance benchmarking and optimization changes.
