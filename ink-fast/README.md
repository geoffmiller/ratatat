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
- `ink-fast/spikes/` — isolated prototypes
- `ink-fast/results/` — benchmark outputs
