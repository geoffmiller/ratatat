# Phase 0.5 CPU hotspots — where time actually goes

Date: 2026-03-15

## Commands

```bash
WORKLOAD=dense WARMUP_RENDERS=10 MEASURE_RENDERS=60 \
  OUTPUT_JSON=ink-fast/results/ink-cpu-dense.json \
  npm run bench:ink:cpu

WORKLOAD=sparse WARMUP_RENDERS=10 MEASURE_RENDERS=60 \
  OUTPUT_JSON=ink-fast/results/ink-cpu-sparse.json \
  npm run bench:ink:cpu

WORKLOAD=unicode WARMUP_RENDERS=10 MEASURE_RENDERS=60 \
  OUTPUT_JSON=ink-fast/results/ink-cpu-unicode.json \
  npm run bench:ink:cpu
```

## High-level summary

| Workload | Top hotspot (function)                                             | Top hotspot (file)                                 |
| -------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| dense    | `stringWidth` @ `node_modules/string-width/index.js` (~28.9% self) | native (~33.5% self), then `string-width` (~31.5%) |
| sparse   | `(idle)` native (~45.5% self)                                      | native (~65.2% self)                               |
| unicode  | `stringWidth` @ `node_modules/string-width/index.js` (~66.5% self) | `node_modules/string-width/index.js` (~69.0% self) |

## Dense observations

Top files by self samples:

- `(native)` — **33.5%**
- `node_modules/string-width/index.js` — **31.5%**
- `node_modules/@alcalzone/ansi-tokenize/build/styledChars.js` — **6.6%**
- `node_modules/@alcalzone/ansi-tokenize/build/diff.js` — **6.1%**
- `node_modules/ink/build/output.js` — **4.6%**

Interpretation: dense mode is split between width measurement and ANSI tokenize/string assembly.

## Unicode observations

Top files by self samples:

- `node_modules/string-width/index.js` — **69.0%**
- `(native)` — **19.7%**
- `node_modules/react-reconciler/cjs/react-reconciler.development.js` — **3.1%**

Interpretation: unicode-heavy workloads are overwhelmingly dominated by width calculation (`string-width`).

## Sparse observations

Sparse is mostly idle/native scheduler overhead; backend rendering work is comparatively small in this workload.

## Actionable next steps

1. **Reduce width-calculation pressure** in hot paths.
2. **Reduce tokenize/string assembly overhead** for dense redraw workloads.
3. Continue validating with all three tools after each change:
   - `bench:ink:stages`
   - `bench:ink:matrix`
   - `bench:ink:cpu`
