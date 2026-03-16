# ink-fast workspace

This folder is the working area for the **Ink performance improvement effort**
(keeping Ink's API while improving backend/runtime performance).

Primary plan:

- [`docs/ink-performance-plan.md`](../docs/ink-performance-plan.md)

Initial execution focus:

1. Phase 0 instrumentation (stage timing hooks + repeatable benchmarks)
2. Phase 1 low-risk JS optimizations
3. Keep all experiments/notes/scripts in this folder unless they belong in `benchmark/` or `docs/`

Suggested structure as work grows:

- `ink-fast/notes/` — findings, profiling snapshots
- `ink-fast/prototypes/` — isolated prototypes
- `ink-fast/results/` — benchmark outputs

Phase 0 prototype currently available:

- `ink-fast/prototypes/ink-stage-profiler.mjs`

Run it:

```bash
npm run bench:ink:stages
# or:
node ink-fast/prototypes/ink-stage-profiler.mjs
```

Run workload matrix (stock/reuse and optional prototype variants):

```bash
npm run bench:ink:matrix
# repeated runs:
RUNS=3 npm run bench:ink:matrix
# include shared-cache variants:
VARIANTS=stock,reuse,stock-sharedcache,reuse-sharedcache npm run bench:ink:matrix
# include fast-width variants:
VARIANTS=stock,reuse,stock-fastwidth,reuse-fastwidth npm run bench:ink:matrix
```

Run CPU hotspot sampling:

```bash
WORKLOAD=unicode WARMUP_RENDERS=20 MEASURE_RENDERS=120 \
  OUTPUT_JSON=ink-fast/results/ink-cpu-unicode.json \
  npm run bench:ink:cpu
# compare with shared-cache patch:
PATCH_SHARED_OUTPUT_CACHES=1 WORKLOAD=unicode npm run bench:ink:cpu
# add INCLUDE_RAW_PROFILE=1 only if you need full cpuprofile payload
```

Latest profiling notes:

- `ink-fast/notes/phase0-baseline.md`
- `ink-fast/notes/phase0-matrix.md`
- `ink-fast/notes/phase0-hotspots.md`
- `ink-fast/notes/phase1-shared-cache-spike.md`
- `ink-fast/notes/phase1-upstream-patch-plan.md`
- `ink-fast/notes/phase1-upstream-patch-validation.md`

Upstream-ready patch drafts:

- `ink-fast/upstream-patches/README.md`
- `ink-fast/upstream-patches/ink-shared-output-caches.patch`

Optional env knobs:

- `WORKLOAD=dense|sparse|unicode` selects the frame generator.
- `PATCH_OUTPUT_REUSE=1` enables a prototype output-surface reuse patch for `Output.get`.
- `PATCH_ASCII_WIDTH_FASTPATH=1` enables an ASCII fast-path in `getStringWidth` cache wrapper.
- `PATCH_SHARED_OUTPUT_CACHES=1` reuses one `Output.caches` object across frames.

```bash
COLS=80 ROWS=24 WARMUP_RENDERS=20 MEASURE_RENDERS=120 MAX_FPS=1000 \
  WORKLOAD=dense SINK=devnull \
  OUTPUT_JSON=ink-fast/results/ink-stage-profile.json \
  node ink-fast/prototypes/ink-stage-profiler.mjs
```
