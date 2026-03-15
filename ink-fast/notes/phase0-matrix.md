# Phase 0 matrix — stock Ink vs output-reuse patch

Date: 2026-03-15

## Command

```bash
WARMUP_RENDERS=5 MEASURE_RENDERS=20 npm run bench:ink:matrix
```

## Results (median ms)

| Workload | Variant | render total | tree/transform est. | output.get | layout |
| -------- | ------- | -----------: | ------------------: | ---------: | -----: |
| dense    | stock   |        1.955 |               1.352 |      0.604 |  0.052 |
| dense    | reuse   |        1.959 |               1.339 |      0.550 |  0.050 |
| sparse   | stock   |        0.569 |               0.033 |      0.541 |  0.044 |
| sparse   | reuse   |        0.415 |               0.035 |      0.384 |  0.052 |
| unicode  | stock   |        4.850 |               4.377 |      0.473 |  0.059 |
| unicode  | reuse   |        5.015 |               4.429 |      0.510 |  0.067 |

## Quick read

- The output-reuse patch shows a clear win for **sparse** workload (lower `output.get` and lower render total).
- It is roughly neutral on **dense** in this run.
- It is slightly worse on **unicode** in this run.

## Interpretation

This supports a phased strategy:

1. Keep using instrumentation to avoid over-generalizing from one workload.
2. Prioritize optimizations with workload-conditional gains behind feature flags.
3. Expand profiling into repeated-run summaries (multiple seeds/runs) before deciding whether to upstream a reuse strategy.
