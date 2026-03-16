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
| dense    | stock   |        3.452 |               1.774 |      1.696 |  0.063 |
| dense    | reuse   |        3.549 |               1.876 |      1.702 |  0.068 |
| sparse   | stock   |        1.678 |               0.051 |      1.620 |  0.065 |
| sparse   | reuse   |        1.676 |               0.051 |      1.630 |  0.065 |
| unicode  | stock   |        6.778 |               5.567 |      1.220 |  0.085 |
| unicode  | reuse   |        6.673 |               5.608 |      1.114 |  0.083 |

## Quick read

- Dense: reuse is slightly slower in this run set.
- Sparse: essentially tied.
- Unicode: reuse is slightly faster.

## Interpretation

1. Output-surface reuse alone is not a dominant lever.
2. Differences are small and workload-sensitive.
3. It should remain a flag-gated optimization, not the primary path.
4. The stronger lever appears to be cache persistence across frames (see `phase1-shared-cache-spike.md`).
