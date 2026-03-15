# Phase 0 matrix — stock Ink vs output-reuse patch

Date: 2026-03-15

## Command

```bash
RUNS=5 WARMUP_RENDERS=5 MEASURE_RENDERS=20 \
  WORKLOADS=dense,sparse,unicode VARIANTS=stock,reuse \
  npm run bench:ink:matrix
```

## Results (median ms over 5 runs)

| Workload | Variant | render total | tree/transform est. | output.get | layout |
| -------- | ------- | -----------: | ------------------: | ---------: | -----: |
| dense    | stock   |        3.654 |               1.859 |      1.785 |  0.067 |
| dense    | reuse   |        3.536 |               1.861 |      1.679 |  0.068 |
| sparse   | stock   |        1.722 |               0.053 |      1.676 |  0.067 |
| sparse   | reuse   |        1.754 |               0.052 |      1.684 |  0.065 |
| unicode  | stock   |        6.849 |               5.670 |      1.220 |  0.083 |
| unicode  | reuse   |        6.644 |               5.577 |      1.054 |  0.078 |

## Quick read

- Output-reuse patch shows a **small win** on dense in this run set (~3.2% render median).
- Output-reuse patch shows a **small win** on unicode in this run set (~3.0% render median).
- Output-reuse patch is **slightly worse** on sparse (~1.9% render median).

## Interpretation

1. Reuse patch is no longer clearly “sparse-only better” in current prototype.
2. Gains are modest and workload-dependent; keep it behind a feature flag.
3. Next optimization focus should still target the dominant dense/unicode hotspots (width calculation + tokenization paths), not just output surface reuse.
4. Re-run this matrix after each optimization slice to avoid overfitting to one workload.
