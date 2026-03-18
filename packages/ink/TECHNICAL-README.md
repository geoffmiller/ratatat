# ink-fast technical readme (proof of concept)

This document explains what changed in `ink-fast`, why those changes matter, and how much they contributed.

## Goal

Build a performance-focused Ink fork that keeps API behavior compatible while reducing per-frame render cost.

## Headline benchmark (Ink vs ink-fast)

Snapshot: [`benchmark/render/results/ink-vs-ink-fast-243e962-vs-4451bab.json`](./benchmark/render/results/ink-vs-ink-fast-243e962-vs-4451bab.json)

- Baseline Ink: `243e962`
- ink-fast: `4451bab`
- Workloads: `dense`, `unicode`, `sparse`
- Settings: `rounds=4`, `repetitions=7`, `runs=120`, `warmup=20`, interleaved order

| Workload | Ink median (ms) | ink-fast median (ms) |       Delta |    Speedup |
| -------- | --------------: | -------------------: | ----------: | ---------: |
| dense    |          2.1688 |               0.1580 | **-92.71%** | **13.72x** |
| unicode  |          5.6133 |               5.1659 |  **-7.97%** |  **1.09x** |
| sparse   |          0.3933 |               0.0461 | **-88.28%** |  **8.53x** |

**Geometric mean speedup:** **5.03x**

---

## What changed, why, and contribution

### 1) Shared caches + object reuse

**Commits:** `96f7422`, `47c27b6`, `31a42a3`

- Reused output caches across frames (`styledChars`, widths, etc.)
- Reused output objects/frame buffers to reduce allocations
- Added bounded cache eviction to cap unbounded growth

**Why it helps:** less GC churn + fewer repeated parse/width computations on repeated text.

---

### 2) Character-width and wrap fast paths

**Commits:** `3406cff`, `63c27e6`, `6020596`

- Fast-path for printable ASCII and known full-width chars
- Render-loop fast-path for single-column graphemes
- Skip costly width checks when text clearly can’t exceed wrap threshold

**Why it helps:** reduces `string-width`/regex overhead in hot loops.

---

### 3) Row rendering and memoization

**Commits:** `ba23889`, `4e9d4fe`, `abb1ec6`

- Line-level memoization (reuse unchanged rendered rows)
- Dedicated unstyled row path
- Faster plain-text styled-char parsing path

**Why it helps:** avoids recomputing stable rows and avoids expensive ANSI logic for plain text.

---

### 4) Styled/ANSI rendering pipeline optimization

**Commits:** `acec33c`, `08b9f5d`

- Faster ANSI style parsing for token streams
- Faster styled row stringification
- Cached style prefix and style-transition ANSI strings

**Why it helps:** cuts repeated style diff/stringification work when style transitions repeat.

**Evidence (ANSI-heavy snapshot):** [`benchmark/render/results/ansi-dense-28a6670-vs-4451bab.json`](./benchmark/render/results/ansi-dense-28a6670-vs-4451bab.json)

- Before (`28a6670`): 1.0406 ms
- After (`4451bab`): 0.5072 ms
- Delta: **-51.26%**

---

### 5) Clip/write hot path simplification

**Commit:** `28a6670`

- Flattened deep branching in write path
- Isolated clip prep + transformer application + line write helpers
- Added clip correctness tests

**Why it helps:** lower overhead in sparse and clipped render scenarios.

---

### 6) Cache tuning and split-line reuse

**Commit:** `36abfd9`

- Added `lines` cache (`getLines`) and reused split lines in width/write prep paths
- Tuned cache defaults to favor lower memory pressure:
  - `maxEntries`: 50,000 → 30,000
  - `pruneToFactor`: 0.8

**Why it helps:** avoids repeated `split('\n')` and lowers long-session memory growth.

---

### 7) Benchmark tooling and reproducibility

**Commits:** `996a060`, `4451bab`

- Added repeatable workload benchmark harness
- Added interleaved compare harness
- Added committed snapshot result files + notes

**Why it helps:** performance claims are reproducible and regressions are easier to catch.

---

## Incremental gain from latest stage

Snapshot: [`benchmark/render/results/ink-fast-28a6670-vs-4451bab.json`](./benchmark/render/results/ink-fast-28a6670-vs-4451bab.json)

This isolates the final stage (cache tuning + style transition caching + benchmark/docs polish) against `28a6670`:

| Workload | Base 28a6670 (ms) | Head 4451bab (ms) |      Delta |
| -------- | ----------------: | ----------------: | ---------: |
| dense    |            0.1760 |            0.1615 | **-8.24%** |
| unicode  |            5.1840 |            5.1658 | **-0.35%** |
| sparse   |            0.0538 |            0.0489 | **-9.14%** |

---

## Reproducing benchmarks

```bash
# Standard workloads
npm run bench:render

# Compare current worktree vs prior ref
BASE_REF=28a6670 npm run bench:render:compare
```

For old refs that predate `benchmark/render/`, use the committed result snapshot or a copied harness approach.

---

## Publishing position (PoC)

This fork is ready to publish as a proof-of-concept:

- measurable speedups on dense/sparse workloads
- no API-level behavior changes required for existing Ink apps
- benchmark tooling + technical rationale included in-repo
