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
| dense    | `stringWidth` @ `node_modules/string-width/index.js` (~29.0% self) | `node_modules/string-width/index.js` (~32.9% self) |
| sparse   | `(idle)` native (~45.5% self)                                      | native (~65.2% self)                               |
| unicode  | `stringWidth` @ `node_modules/string-width/index.js` (~63.1% self) | `node_modules/string-width/index.js` (~65.2% self) |

## Dense observations

Top files by self samples:

- `node_modules/string-width/index.js` — **32.9%**
- `(native)` — **30.4%**
- `node_modules/@alcalzone/ansi-tokenize/build/styledChars.js` — **7.7%**
- `node_modules/ink/build/output.js` — **6.8%**
- `node_modules/@alcalzone/ansi-tokenize/build/diff.js` — **6.3%**

Interpretation: dense mode is split between width measurement and ANSI tokenization/output assembly.

## Unicode observations

Top files by self samples:

- `node_modules/string-width/index.js` — **65.2%**
- `(native)` — **18.4%**
- `node_modules/react-reconciler/cjs/react-reconciler.development.js` — **3.3%**
- `node_modules/ink/build/output.js` — **3.0%**

Interpretation: unicode-heavy workloads are dominated by width calculation (`string-width`) much more than tree traversal or diff logic.

## Sparse observations

Sparse is mostly idle/native scheduler overhead; backend rendering work is comparatively small in this workload.

## Actionable next steps

1. **Attack width-calculation pressure first**
   - reduce repeated `stringWidth` invocations on unchanged content
   - avoid width recompute in obvious stable paths
2. **Then optimize ANSI tokenize/diff hot paths** (dense-specific gains)
3. Keep all changes behind flags and re-run:
   - `bench:ink:stages`
   - `bench:ink:matrix`
   - `bench:ink:cpu`
