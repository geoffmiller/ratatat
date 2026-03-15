# Phase 0 baseline — Ink stage profiler

Date: 2026-03-15

## Command

```bash
COLS=80 ROWS=24 WARMUP_RENDERS=10 MEASURE_RENDERS=40 MAX_FPS=1000 \
  WORKLOAD=dense SINK=devnull PATCH_OUTPUT_REUSE=0 \
  OUTPUT_JSON=ink-fast/results/ink-stage-profile.json \
  node ink-fast/prototypes/ink-stage-profiler.mjs
```

## Timing summary (from `ink-fast/results/ink-stage-profile.json`)

| Stage                                            | Mean (ms) | Median (ms) | p95 (ms) |
| ------------------------------------------------ | --------: | ----------: | -------: |
| layout (`Yoga.calculateLayout`)                  |     0.066 |       0.062 |    0.075 |
| output assembly (`Output.get`)                   |     1.720 |       1.558 |    2.263 |
| render total (`onRender.renderTime`)             |     3.538 |       3.432 |    4.216 |
| estimated tree/transform (`render - output.get`) |     1.817 |       1.834 |    1.953 |
| cache `getStringWidth` wall time                 |     0.145 |       0.129 |    0.256 |
| cache `getStyledChars` wall time                 |     0.225 |       0.217 |    0.262 |
| stdout.write wall time                           |     0.019 |       0.018 |    0.029 |

## Activity summary

| Metric                      | Median |
| --------------------------- | -----: |
| stdout bytes/render         |   5810 |
| stdout writes/render        |      3 |
| `output.write` ops/render   |      1 |
| `output.write` chars/render |   1943 |
| `output.write` lines/render |     24 |

## Cache totals (aggregate across measured renders)

- `getStringWidth`: `76800` calls, `99.5%` hit rate, `5.781 ms` wall time
- `getStyledChars`: `960` calls, `58.3%` hit rate, `8.994 ms` wall time
- `getWidestLine`: `0` calls in this workload

## Notes

- `SINK=devnull` isolates backend pipeline costs from terminal emulator paint time.
- Absolute timings vary with CPU load; compare ratios and repeated-run medians.
- In this dense baseline, biggest buckets remain:
  1. tree/transform (estimated),
  2. `Output.get`,
  3. string-width/tokenization-related work.
