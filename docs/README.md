# Docs maintainer notes

## Conventions

- **Tone:** direct and technical.
- **Links:** use relative links (e.g. `[Hooks](hooks.md)`).
- **Code blocks:** always include language tags (`tsx`, `ts`, `bash`).
- **Accuracy first:** verify behavior against `src/` before documenting it.

## Page ownership

| Page             | Source of truth                                                |
| ---------------- | -------------------------------------------------------------- |
| `components.md`  | `src/react.ts`, `src/styles.ts`, `src/renderer.ts`             |
| `hooks.md`       | `src/hooks.ts`, `src/focus.ts`, `src/input.ts`                 |
| `ink-compat.md`  | `src/react.ts`, `src/hooks.ts`, `compat-test/`                 |
| `raw-buffer.md`  | `src/lib.rs`, `src/terminal.rs`, `src/inline.ts`, `index.d.ts` |
| `render-loop.md` | `src/react.ts`, `src/app.ts`, `src/reconciler.ts`              |
| `decisions.md`   | Maintainer-updated architecture log                            |
| `examples.md`    | `examples/`, `examples-raw/`                                   |

## Update checklist

When API behavior changes:

1. Update reference docs (`components.md`, `hooks.md`, `ink-compat.md`)
2. Update quickstarts if entry flow changed
3. Update `examples.md` for renamed/added/removed demos
4. Validate internal links
5. Run at least one relevant example

## Adding a new page

1. Create `docs/<name>.md`
2. Add it to `docs/index.md`
3. Cross-link from related pages

## GitHub Pages config

Pages config lives in `docs/_config.yml` (Jekyll/minima).
