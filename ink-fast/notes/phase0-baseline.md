# Phase 0 baseline — Ink stage profiler

Date: 2026-03-15

## Command

```bash
COLS=80 ROWS=24 WARMUP_RENDERS=10 MEASURE_RENDERS=40 MAX_FPS=1000 WORKLOAD=dense SINK=devnull \
  OUTPUT_JSON=ink-fast/results/ink-stage-profile.json \
  node ink-fast/prototypes/ink-stage-profiler.mjs
```

## Summary (from `ink-fast/results/ink-stage-profile.json`)

| Stage                                            | Mean (ms) | Median (ms) | p95 (ms) |
| ------------------------------------------------ | --------: | ----------: | -------: |
| layout (`Yoga.calculateLayout`)                  |     0.203 |       0.154 |    0.434 |
| output assembly (`Output.get`)                   |     2.735 |       1.931 |    5.024 |
| render total (`onRender.renderTime`)             |     7.903 |       6.523 |   14.828 |
| estimated tree/transform (`render - output.get`) |     5.168 |       4.326 |    9.855 |
| stdout.write wall time                           |     0.069 |       0.045 |    0.142 |

## Notes

- `SINK=devnull` measures backend pipeline behavior without terminal emulator paint cost.
- `stdout.write` is intentionally tiny in this setup; this is expected.
- Absolute timings can vary significantly with CPU load; compare stage ratios and use repeated runs.
- This profile suggests optimization effort should focus on:
  1. tree/transform phase,
  2. `Output.get` assembly costs,
  3. allocation/GC in those paths.
