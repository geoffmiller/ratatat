# Phase 0 baseline — Ink stage profiler

Date: 2026-03-15

## Command

```bash
COLS=80 ROWS=24 WARMUP_RENDERS=10 MEASURE_RENDERS=40 MAX_FPS=1000 \
  WORKLOAD=dense SINK=devnull \
  PATCH_OUTPUT_REUSE=0 PATCH_ASCII_WIDTH_FASTPATH=0 PATCH_SHARED_OUTPUT_CACHES=0 \
  OUTPUT_JSON=ink-fast/results/ink-stage-profile.json \
  node ink-fast/prototypes/ink-stage-profiler.mjs
```

## Timing summary (from `ink-fast/results/ink-stage-profile.json`)

| Stage                                            | Mean (ms) | Median (ms) | p95 (ms) |
| ------------------------------------------------ | --------: | ----------: | -------: |
| layout (`Yoga.calculateLayout`)                  |     0.067 |       0.064 |    0.083 |
| output assembly (`Output.get`)                   |     1.655 |       1.534 |    2.347 |
| render total (`onRender.renderTime`)             |     3.418 |       3.254 |    4.215 |
| estimated tree/transform (`render - output.get`) |     1.763 |       1.721 |    1.936 |
| cache `getStringWidth` wall time                 |     0.371 |       0.344 |    0.481 |
| cache `getStyledChars` wall time                 |     0.232 |       0.214 |    0.295 |
| stdout.write wall time                           |     0.019 |       0.020 |    0.026 |

## Activity summary

| Metric                                  | Median |
| --------------------------------------- | -----: |
| stdout bytes/render                     |   5810 |
| stdout writes/render                    |      3 |
| `output.write` ops/render               |      1 |
| `output.write` chars/render             |   1943 |
| `output.write` lines/render             |     24 |
| `getStringWidth` fast-path calls/render |      0 |

## Cache totals (aggregate across measured renders)

- `getStringWidth`: `76800` calls, `99.5%` hit rate, `400` misses, `14.844 ms` wall time
- `getStyledChars`: `960` calls, `58.3%` hit rate, `400` misses, `9.265 ms` wall time
- `getWidestLine`: `0` calls in this workload

## Notes

- `SINK=devnull` isolates backend pipeline costs from terminal emulator paint time.
- Absolute timings vary with CPU load; compare ratios and repeated-run medians.
- In this dense baseline, biggest buckets remain:
  1. tree/transform (estimated),
  2. `Output.get`,
  3. width/tokenization-related work.
