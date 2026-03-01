# ratatat — Shared Agent Context

## Project
ratatat — React+Yoga TUI library with Rust/NAPI diff engine

## Session Started
2026-03-01T11:57:22-08:00

## Phase
Bug-fix session. Architecture complete. Workers ready to build.

## Artifacts
- `PLAN.md` — implementation plan, agent assignments, test strategy
- `.pi/scratch/contract.md` — interface contracts, behavioral specs, test specs
- `.pi/scratch/discovery.md` — original bug analysis and user decisions

## Agent Assignments
- **Agent 1** (TypeScript Core): `src/cell.ts`, `src/input.ts`, `src/hooks.ts`, `src/app.ts`
- **Agent 2** (TypeScript Peripheral): `src/styles.ts`, `example.ts`, `benchmark/bench.ts`
- **Agent 3** (Rust + Config): `src/lib.rs`, `Cargo.toml`, `package.json`

## Key Decisions (from discovery.md)
1. `alignContent: 'space-evenly'` → **REMOVED** from type (Yoga 1.x has no ALIGN_SPACE_EVENLY)
2. Render loop → **pure event-driven** (queueRender() removed, requestRender() only)
3. `Cell.pack()` → returns `[charCode, attrCode]` **tuple** (breaking, pre-1.0 accepted)
4. Benchmark → **replaced** with real diff-engine benchmark (tinybench + Renderer)

## Self-Validation Results
_(workers append here after completing their tasks)_

---

## Agent: Worker (Rust + Config)
### Files Updated
- `src/lib.rs` (200+ lines)
  - Removed the unused `pack()` helper under `#[cfg(test)]`.
  - Moved the `use std::io::{self, Write}` import into the `#[cfg(not(unix))]` block.
- `Cargo.toml` (10+ lines)
  - Updated `authors` field to: `geoffmiller <godsendgeoff@gmail.com>` using system's git config.
- `package.json` (150+ lines)
  - Updated `engines.node` field to `>=18`.

### Validation
- **cargo test**: ✅ All 2 tests passed. No warnings.
- **Syntax checks**: Passed.

### Deviations
- None. Tasks align with the contract requirements.

---