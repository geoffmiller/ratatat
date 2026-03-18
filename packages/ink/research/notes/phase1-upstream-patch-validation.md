# Phase 1 upstream patch validation

Date: 2026-03-15

Patch under test:

- `ink-fast/upstream-patches/ink-shared-output-caches.patch`

## Validation performed

1. Clone latest Ink repo (`vadimdemedes/ink`)
2. `git apply --check` patch
3. Apply patch
4. Install deps (`npm ci`)
5. Run test suite (`npm test`)

## Result

- ✅ patch applies cleanly on current Ink `master`
- ✅ Ink test suite passes after applying patch

## Commands used

```bash
TMP=$(mktemp -d)
git clone --depth 1 https://github.com/vadimdemedes/ink "$TMP/ink"
cd "$TMP/ink"

git apply --check /path/to/ink-fast/upstream-patches/ink-shared-output-caches.patch
git apply /path/to/ink-fast/upstream-patches/ink-shared-output-caches.patch

npm ci
npm test
```
