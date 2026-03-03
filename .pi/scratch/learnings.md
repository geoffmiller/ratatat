# Learnings — ratatat

## Yoga's flexDirection default is 'column', not 'row'
- **What I expected**: Yoga would default to `flexDirection: 'row'` like CSS
- **What actually happened**: Yoga defaults to `FLEX_DIRECTION_COLUMN`. Sibling `<Box>` nodes stacked vertically instead of horizontally. The justify-content example rendered X and Y on separate rows.
- **Fix**: In `reconciler.ts createInstance`, always set `flexDirection: 'row'` when the prop is absent. This is what Ink does too — it's a deliberate decision to match CSS expectations, not a bug.
- **Rule**: When wrapping a layout engine, check its defaults against the target API's defaults. They won't match.

## "Already fixed" is not the same as "already tested"
- **What I expected**: `width="100%"` was the blocker for Ink examples — the summary said so
- **What actually happened**: `width="100%"` was already working perfectly via `setWidthPercent`. I validated it with a buffer dump in 30 seconds. The real blocker was string color names.
- **Fix**: Verify assumptions with a probe before building. The buffer dump takes 2 minutes and shows exactly what's broken. Don't trust a summary over a live test.

## `useApp()` return shape matters for Ink compat
- **What I expected**: Returning the raw `RatatatApp` instance was fine — callers could use `app.quit()`
- **What actually happened**: Every Ink example uses `const { exit } = useApp()`. Returning the raw app requires callers to learn ratatat-specific API.
- **Fix**: `useApp()` returns `{ exit, quit }`. `exit` is the Ink-compat alias. `quit` stays for ratatat-native callers. Backward-compatible.
- **Rule**: For a compatibility layer, match the shape of what you're emulating, not what's convenient internally.

## resolveColor belongs in styles.ts, not reconciler.ts
- **What I expected**: color resolution might live in the reconciler near where props are applied
- **What actually happened**: Putting it in `styles.ts` was the right call — the renderer also needs it for `borderColor`. Single source of truth. Both files import from `styles.ts`.
- **Rule**: Color resolution is a data transformation, not a React concern. Put it with the other style utilities.

## Benchmark baseline (2026-03-01, M-series Mac, Node 23)

Results from `npm run bench` — ratatat vs Ink render throughput:

| Suite | ratatat ops/sec | Ink ops/sec | Speedup |
|---|---|---|---|
| initial mount (simple) | 67,613 | 8,189 | **8.3x** |
| initial mount (complex) | 40,657 | 1,396 | **29.1x** |
| rerender (simple) | 93,941 | 8,085 | **11.6x** |
| rerender (complex) | 48,760 | 1,367 | **35.7x** |

Diff engine (ratatat only):
| Scenario | ops/sec | avg latency |
|---|---|---|
| nothing changed (hot path) | 109,910 | 9.4µs |
| all cells dirty (max-diff) | 69,267 | 15.0µs |
| 5% dirty (typical frame) | 41,336 | 25.0µs |

p99 latency comparison (complex rerender): ratatat **24µs** vs Ink **1560µs** (65x better tail latency)

**Why**: Uint32Array buffer writes vs string concatenation + chalk colorization. Rust diff engine vs full string re-render.

## AVA concurrency + react-test-renderer interference
- **What I expected**: Each AVA test is isolated — tests in the same file can run concurrently safely
- **What actually happened**: Tests using async `act()` with `react-test-renderer` share React's global scheduler. Tests that each pass solo fail when run together due to scheduler state bleed between concurrent tests.
- **Fix**: Use `test.serial` for any test that uses async `act()` + `react-test-renderer`. Always run the *full* suite immediately after writing tests — don't rely on individual `--match` passes as proof of correctness.

## tinybench v3 API shape (result fields are nested)
- **What I expected**: `task.result.hz`, `task.result.mean`, `task.result.p99` — same as v2
- **What actually happened**: v3 restructured results into `{ latency: { mean, p99, ... }, throughput: { mean, ... } }`. The old top-level fields are gone. All values were `NaN` / 0.
- **Fix**: Always probe a library's output shape with a 2-min script before writing analysis against it: `node --input-type=module -e "import {Bench} from 'tinybench'; const b = new Bench({time:100}); b.add('t', ()=>{}); await b.run(); console.log(JSON.stringify(b.tasks[0].result, null, 2))"`

## tsc outDir same as rootDir silently excludes all source
- **What I expected**: `"outDir": ".", "include": ["bench.ts"]` would compile bench.ts to bench.js in the same directory
- **What actually happened**: tsc excludes the outDir from source scanning when they're the same path. Error: `No inputs were found in config file`. No obvious connection to outDir in the message.
- **Fix**: Use `"files": ["bench.ts"]` instead of `"include"`, which bypasses the exclusion logic. Or set outDir to a different path.

## useFocusManager() returns new object each render — use refs in tests
- **What I expected**: Assigning `manager = useFocusManager()` in a component body would give me live state after `act()` updates
- **What actually happened**: Each render produces a new object closed over that render's state. The variable holds stale state after re-renders.
- **Fix**: Use `managerRef.current = useFocusManager()` so the ref always points to the latest render's return value. Same pattern applies to any hook return value captured in tests.

## Yoga OOB insert and JS/Yoga child count desync
- **What I expected**: `insertChild(child, index)` would fail with "Child already has a parent" only when the child was actually still attached somewhere
- **What actually happened**: Yoga throws the same error for OOB index inserts (index > childCount). During a React batch commit with multiple `insertBefore` calls, the JS `children` array and Yoga's internal child list diverge — each removal shrinks Yoga's count differently than our indexOf-based index computation expects.
- **Fix**: Clamp every insert: `const safeIndex = Math.min(index, this.yogaNode.getChildCount())`. Use Yoga's actual count, not the JS array length.
- **Rule**: Always do the wasm/FFI operation FIRST. Update JS bookkeeping only after it succeeds. This prevents a thrown wasm error from leaving JS state corrupt.

## Yoga abort() is a catchable JS Error, not process.exit()
- **What I expected**: `yoga-layout-prebuilt`'s `abort()` would terminate the process (like native wasm abort)
- **What actually happened**: It throws a JS Error object. Fully catchable with try/catch. The process continues. React's own commit phase wraps host mutations in try/catch, so a Yoga throw is silently swallowed by React — but the partial wasm state change persists, making subsequent calculateLayout also abort.
- **Fix**: Wrap `yogaNode.insertChild()` in try/catch. On catch, don't update JS bookkeeping (return early) so the two don't diverge further.
