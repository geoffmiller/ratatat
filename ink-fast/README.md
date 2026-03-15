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

Run workload matrix (stock vs output-reuse patch):

```bash
npm run bench:ink:matrix
# repeated runs:
RUNS=3 npm run bench:ink:matrix
```

Latest profiling notes:

- `ink-fast/notes/phase0-baseline.md`
- `ink-fast/notes/phase0-matrix.md`

Optional env knobs:

- `WORKLOAD=dense|sparse|unicode` selects the frame generator.
- `PATCH_OUTPUT_REUSE=1` enables a prototype output-surface reuse patch for `Output.get`.

```bash
COLS=80 ROWS=24 WARMUP_RENDERS=20 MEASURE_RENDERS=120 MAX_FPS=1000 \
  WORKLOAD=dense SINK=devnull \
  OUTPUT_JSON=ink-fast/results/ink-stage-profile.json \
  node ink-fast/prototypes/ink-stage-profiler.mjs
```
