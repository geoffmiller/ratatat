# Phase 0 matrix — stock Ink vs output-reuse patch

Date: 2026-03-15

## Command

```bash
RUNS=3 WARMUP_RENDERS=5 MEASURE_RENDERS=20 npm run bench:ink:matrix
```

## Results (median ms over 3 runs)

| Workload | Variant | render total | tree/transform est. | output.get | layout |
| -------- | ------- | -----------: | ------------------: | ---------: | -----: |
| dense    | stock   |        1.967 |               1.357 |      0.599 |  0.052 |
| dense    | reuse   |        2.050 |               1.354 |      0.651 |  0.051 |
| sparse   | stock   |        0.547 |               0.037 |      0.518 |  0.051 |
| sparse   | reuse   |        0.422 |               0.034 |      0.392 |  0.052 |
| unicode  | stock   |        4.952 |               4.391 |      0.509 |  0.077 |
| unicode  | reuse   |        5.031 |               4.493 |      0.514 |  0.072 |

## Quick read

- The output-reuse patch shows a clear win for **sparse** workload (lower `output.get` and lower render total).
- It is worse on **dense** in this 3-run sample.
- It is slightly worse on **unicode** in this 3-run sample.

## Interpretation

This supports a phased strategy:

1. Keep using instrumentation to avoid over-generalizing from one workload.
2. Treat output-surface reuse as a **workload-conditional** optimization (good sparse candidate, not broadly faster yet).
3. Prioritize dense/unicode wins in the tree/transform path before attempting a broad reuse rollout.
