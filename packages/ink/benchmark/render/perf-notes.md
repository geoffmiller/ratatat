# ink-fast perf notes

This file tracks what has actually helped in this fork, with workload context.

## Methodology

- Renderer benchmark: `benchmark/render/bench-render.mjs`
- Compare benchmark: `benchmark/render/compare-render.mjs` (interleaved run order)
- Main workloads:
  - `dense` (high churn)
  - `unicode` (wide chars / emoji)
  - `sparse` (small updates)
- Styled stress workload: temporary ANSI-dense harness used during styled-path tuning.

## Recent optimization changelog

| Commit    | Change                                                  | Observed impact (local median-based runs)                  |
| --------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| `ba23889` | Row memoization for unchanged output lines              | Big sparse win; neutral/slight win elsewhere               |
| `4e9d4fe` | Unstyled row fast-path + continuation-cell reuse        | Dense/unicode/sparse wins                                  |
| `abb1ec6` | Plain-text styled-char parse fast-path                  | Dense/unicode wins; sparse near-noise                      |
| `63c27e6` | Single-column grapheme width fast-path in renderer loop | Small-to-moderate cross-workload wins                      |
| `6020596` | Skip costly width checks for non-ASCII narrow text      | Large dense non-ASCII win; neutral elsewhere               |
| `acec33c` | Faster ANSI style parsing + styled row rendering        | ANSI-heavy wins; neutral on plain workloads                |
| `28a6670` | Streamlined clipped-write hot path                      | Sparse + ANSI-heavy gains; dense improvement               |
| `36abfd9` | Cache eviction tuning + split-line cache reuse          | Similar runtime, lower memory under high-cardinality churn |
| `08b9f5d` | Style transition micro-cache                            | Large ANSI-heavy win; neutral for plain workloads          |

## Cache tuning decision

Defaults changed to:

- `maxEntries = 30_000` (was 50_000)
- `pruneToFactor = 0.8` (prune to 80% when cap is hit)

Reasoning:

- High-cardinality cache-burn runs showed similar runtime to previous defaults.
- Heap usage was significantly lower in local tests (roughly ~53 MB vs ~79 MB in one 180k-iteration scenario).
- Lower memory pressure is a better long-session default for CLI apps.

## Current hotspot snapshot (`node --prof`)

Dense workload profile snapshot after the latest changes:

- JS hotspot now small and concentrated around `mightExceedWidth` in `render-node-to-output`.
- Prior `string-width` dominance is greatly reduced in these runs.
- A large share of samples are in Node/V8 internals (C++), so further wins may require bigger architecture changes (scheduler/write pipeline), not just micro-optimizations.

## Notes

- Sparse workload is sensitive to noise and scheduler jitter; rely on interleaved comparisons and medians.
- ANSI-heavy workloads are where style-transition and tokenization changes pay off most.
- Keep evaluating perf with both renderer workloads and at least one styled stress case.
