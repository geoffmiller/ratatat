# Phase 1 spike — shared output caches across frames

Date: 2026-03-15

## Hypothesis

`Output` caches are recreated every render because Ink constructs a new `Output` each frame.
If we reuse one cache object across frames, we should reduce repeated misses in:

- `getStringWidth`
- `getStyledChars`

…and reduce render time.

## Command

```bash
RUNS=5 WARMUP_RENDERS=5 MEASURE_RENDERS=20 \
  WORKLOADS=dense,sparse,unicode \
  VARIANTS=stock,reuse,stock-sharedcache,reuse-sharedcache \
  npm run bench:ink:matrix
```

## Results (median ms over 5 runs)

| Workload | Variant           | render med | output.get med | strWidth misses/render | styledChars misses/render |
| -------- | ----------------- | ---------: | -------------: | ---------------------: | ------------------------: |
| dense    | stock             |      3.452 |          1.696 |                   10.0 |                      10.0 |
| dense    | reuse             |      3.549 |          1.702 |                   10.0 |                      10.0 |
| dense    | stock-sharedcache |      3.237 |          1.489 |                    0.0 |                       0.0 |
| dense    | reuse-sharedcache |      3.096 |          1.411 |                    0.0 |                       0.0 |
| sparse   | stock             |      1.678 |          1.620 |                    2.0 |                       2.0 |
| sparse   | reuse             |      1.676 |          1.630 |                    2.0 |                       2.0 |
| sparse   | stock-sharedcache |      1.665 |          1.618 |                    0.0 |                       1.0 |
| sparse   | reuse-sharedcache |      1.545 |          1.466 |                    0.0 |                       1.0 |
| unicode  | stock             |      6.778 |          1.220 |                   10.0 |                      10.0 |
| unicode  | reuse             |      6.673 |          1.114 |                   10.0 |                      10.0 |
| unicode  | stock-sharedcache |      6.762 |          1.061 |                    0.0 |                       0.0 |
| unicode  | reuse-sharedcache |      6.598 |          0.980 |                    0.0 |                       0.0 |

## Relative deltas vs stock (render median)

- dense
  - `stock-sharedcache`: **~6.2% faster** (`3.452 -> 3.237`)
  - `reuse-sharedcache`: **~10.3% faster** (`3.452 -> 3.096`)
- sparse
  - `stock-sharedcache`: **~0.8% faster** (`1.678 -> 1.665`)
  - `reuse-sharedcache`: **~7.9% faster** (`1.678 -> 1.545`)
- unicode
  - `stock-sharedcache`: **~0.2% faster** (`6.778 -> 6.762`)
  - `reuse-sharedcache`: **~2.7% faster** (`6.778 -> 6.598`)

## Takeaways

1. Shared-cache variants consistently drive cache misses to ~0 for dense/unicode.
2. `output.get` median drops materially with shared caches.
3. Render-time wins are workload-dependent but generally positive in this sample.
4. `reuse-sharedcache` is the strongest combined variant in this run.

## Additional note on ASCII fast-path spike

`PATCH_ASCII_WIDTH_FASTPATH=1` showed near-zero fast-path calls in dense/unicode workloads (expected, non-ASCII glyph sets), so it is not a primary optimization lever for these scenarios.
