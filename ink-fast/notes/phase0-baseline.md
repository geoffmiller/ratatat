# Phase 0 baseline — Ink stage profiler

Date: 2026-03-15

## Command

```bash
COLS=80 ROWS=24 WARMUP_RENDERS=10 MEASURE_RENDERS=40 MAX_FPS=1000 SINK=devnull \
  OUTPUT_JSON=ink-fast/results/ink-stage-profile.json \
  node ink-fast/prototypes/ink-stage-profiler.mjs
```

## Summary (from `ink-fast/results/ink-stage-profile.json`)

| Stage                                            | Mean (ms) | Median (ms) | p95 (ms) |
| ------------------------------------------------ | --------: | ----------: | -------: |
| layout (`Yoga.calculateLayout`)                  |     0.059 |       0.057 |    0.069 |
| output assembly (`Output.get`)                   |     0.595 |       0.558 |    0.704 |
| render total (`onRender.renderTime`)             |     1.991 |       1.970 |    2.177 |
| estimated tree/transform (`render - output.get`) |     1.396 |       1.389 |    1.451 |
| stdout.write wall time                           |     0.018 |       0.018 |    0.027 |

## Notes

- `SINK=devnull` measures backend pipeline behavior without terminal emulator paint cost.
- `stdout.write` is intentionally tiny in this setup; this is expected.
- This profile suggests optimization effort should focus on:
  1. tree/transform phase,
  2. `Output.get` assembly costs,
  3. allocation/GC in those paths.
