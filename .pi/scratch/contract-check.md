# Contract Check Results

| # | File | Status | Notes |
|---|------|--------|-------|
| 1 | src/cell.ts | PASS | Cell.pack() returns [number, number]; getChar/getFg/getBg/getStyles take correct slot values |
| 2 | src/input.ts | PASS | _boundHandleData field present; start() assigns it; stop() uses it in removeListener with null guard |
| 3 | src/hooks.ts | PASS | useRef for handler; sync effect (no deps); stable effect with [context] dep array |
| 4 | src/app.ts | PASS | queueRender() absent; start() does not call it |
| 5 | src/styles.ts | PASS | 'space-evenly' removed from alignContent type; 'space-evenly'→JUSTIFY_SPACE_EVENLY in justifyContent map |
| 6 | example.ts | PASS | Tuple destructure [ch, attr] = Cell.pack(); idx*2 indexing throughout |
| 7 | benchmark/bench.ts | PASS | Imports Renderer from dist/; uses tinybench; no plus100 |
| 8 | src/lib.rs | PASS | Dead pack() fn removed; std::io import gated with #[cfg(not(unix))]; 0 warnings |
| 9 | Cargo.toml | PASS | authors updated from template to project author |
| 10 | package.json | PASS | engines.node === ">=18" |

## Overall Status: PASS
