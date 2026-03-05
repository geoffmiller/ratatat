# compat-test/

Drop-in compatibility test — Ink examples running against Ratatat with only the import path changed.

## What this proves

Every file here is a verbatim copy of an Ink example (`/ink/examples/`) with one change:

```diff
-import { render, Box, Text, ... } from '../../src/index.js';
+import { render, Box, Text, ... } from '../dist/index.js';
```

Zero other changes. If it typechecks and runs, Ratatat is a drop-in replacement for that example.

## Type check all

```sh
npx tsc -p compat-test/tsconfig.json --noEmit
```

## Run an example

```sh
node --import @oxc-node/core/register compat-test/counter.tsx
node --import @oxc-node/core/register compat-test/borders.tsx
node --import @oxc-node/core/register compat-test/chat.tsx
# etc.
```

## Coverage

| Example | Status | Notes |
|---|---|---|
| borders | ✅ | |
| box-backgrounds | ✅ | |
| chat | ✅ | |
| concurrent-suspense | ✅ | `{concurrent:true}` option ignored (always concurrent) |
| counter | ✅ | |
| incremental-rendering | ✅ | `{incrementalRendering:true}` option ignored |
| justify-content | ✅ | |
| static | ✅ | |
| stress-test | ✅ | |
| suspense | ✅ | |
| terminal-resize | ✅ | `{patchConsole,exitOnCtrlC}` options ignored |
| use-focus | ✅ | Fixed implicit `any` on `{label}` prop (Ink example bug) |
| use-focus-with-id | ✅ | Fixed `id: number` → `id: string` (Ink example bug) |
| use-input | ✅ | |
| use-stderr | ✅ | |
| use-stdout | ✅ | |
| use-transition | ✅ | `{concurrent:true}` option ignored |
| aria | ✅ | `aria-role`/`aria-state`/`aria-hidden` props ignored (no a11y layer); `useIsScreenReaderEnabled` returns false |
| cursor-ime | ✅ | `useCursor` is a no-op stub; cursor positioning not supported |
| table | ⏭ | Requires `@faker-js/faker` — external dep not in ratatat |
| render-throttle | ⏭ | Requires `maxFps` option — Ratatat is event-driven |
| router | ⏭ | Requires `react-router` |
| subprocess-output | ⏭ | Fragile external deps |
