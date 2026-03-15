# Upstream patches for Ink

This folder contains ready-to-apply patch drafts against `vadimdemedes/ink`.

## Patch: shared output caches

- File: `ink-shared-output-caches.patch`
- Target files:
  - `src/output.ts`
  - `src/renderer.ts`

### What it changes

1. `Output` accepts an optional external cache object (`OutputCaches`)
2. `renderer` keeps persistent cache instances and passes them into new `Output` objects each frame

This preserves Ink's public API and avoids per-frame cache cold starts in hot redraw loops.

## Apply on Ink repo

```bash
git clone https://github.com/vadimdemedes/ink.git
cd ink

git apply --check /path/to/ink-fast/upstream-patches/ink-shared-output-caches.patch
git apply /path/to/ink-fast/upstream-patches/ink-shared-output-caches.patch
```

## Validate

```bash
npm ci
npm test
```

See validation note:

- `../notes/phase1-upstream-patch-validation.md`
