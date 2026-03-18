# Benchmark result snapshots

These files are committed benchmark snapshots used in the proof-of-concept writeup.

## Files

- `ink-vs-ink-fast-243e962-vs-4451bab.json`
  - Upstream Ink (`243e962`) vs `ink-fast` (`4451bab`) on `dense`, `unicode`, `sparse`.
- `ink-fast-28a6670-vs-4451bab.json`
  - Incremental comparison showing latest-stage gains over `28a6670`.
- `ansi-dense-28a6670-vs-4451bab.json`
  - ANSI-heavy styled workload snapshot for the styled rendering optimizations.

## Reproduction

```bash
# standard workloads (refs that already include benchmark/render scripts)
BASE_REF=28a6670 HEAD_REF=WORKTREE \
WORKLOADS=dense,unicode,sparse ROUNDS=4 REPETITIONS=7 RUNS=120 WARMUP=20 \
node benchmark/render/compare-render.mjs
```

> Note: very old refs may not contain benchmark scripts. The upstream snapshot (`243e962` vs `4451bab`) was produced with a copied harness and committed here for traceability.
