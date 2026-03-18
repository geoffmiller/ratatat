# Render benchmark (stable-ish local runs)

Run repeated render benchmarks for dense/unicode/sparse workloads and emit JSON stats.

## Usage

```bash
npm run build
node benchmark/render/bench-render.mjs
```

Or via npm script:

```bash
npm run bench:render
```

## Compare two refs

```bash
BASE_REF=acec33c npm run bench:render:compare
```

Defaults:

- `BASE_REF=HEAD~1`
- `HEAD_REF=WORKTREE` (current checkout)
- interleaved rounds to reduce warm-order bias

## Tunables

Set env vars to control runtime and noise:

- `WORKLOADS` (default: `dense,unicode,sparse`)
- `REPETITIONS` (default: `9`; compare script default is `5`)
- `WARMUP` (default: `20`)
- `RUNS` (default: `120`)
- `COLS` (default: `80`)
- `ROWS` (default: `24`)
- `ROUNDS` (compare script only, default: `4`)

Example:

```bash
REPETITIONS=15 RUNS=200 node benchmark/render/bench-render.mjs
```

## Notes

- Output is JSON so it can be diffed between commits.
- Use median-based comparisons (`medianOfMedians`) to reduce outlier noise.
- Compare script reports per-workload `deltaPercent` where negative means faster.
- See [`perf-notes.md`](./perf-notes.md) for fork-specific optimization history.
- See [`results/README.md`](./results/README.md) for committed benchmark snapshots.
