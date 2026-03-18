# Draft PR description for Ink: reuse Output caches across frames

## Summary

This patch adds cache reuse across renders in Ink's output pipeline without changing the public API.

### What changes

- `Output` now accepts an optional `caches` object.
- `renderer` maintains persistent `OutputCaches` instances and passes them into newly created `Output` objects each frame.

## Why

`Output` is recreated every render, and it currently initializes fresh caches each time. That causes repeated misses for width/tokenized text keys in redraw-heavy workloads.

Reusing cache objects across frames avoids those repeated misses.

## Scope

- `src/output.ts`
- `src/renderer.ts`

No changes to Ink's component/hook APIs.

## Validation

- Patch applies cleanly to latest `master`.
- `npm test` passes after applying patch.
- External profiling prototype (in ratatat `ink-fast` workspace) showed:
  - lower cache misses,
  - lower `Output.get` median,
  - improved render medians in dense/unicode-heavy workloads.

## Risk notes

- Caches can grow over long sessions if applications render high-cardinality unique strings.
- Follow-up options if needed:
  - map-size caps,
  - periodic clear-on-threshold,
  - LRU policy.

## Backward compatibility

- Fully backward-compatible.
- Existing constructor calls continue to work.
