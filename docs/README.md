# Docs maintainer notes

## Conventions

- **Tone:** direct and technical. No fluff. Assume the reader knows JavaScript/TypeScript.
- **Links:** use relative paths (e.g. `[Hooks](hooks.md)`). GitHub Pages resolves these correctly. Do not use absolute URLs for internal pages.
- **Code blocks:** always include a language tag (` ```tsx `, ` ```ts `, ` ```bash `).
- **Accuracy over completeness:** if you're not sure something is current, check `src/` before writing it.

## Page ownership

| Page              | Source of truth                                                   |
| ----------------- | ----------------------------------------------------------------- |
| `components.md`   | `src/react.ts`                                                    |
| `hooks.md`        | `src/hooks.ts` (Ratatat-only) + `src/react.ts` (Ink-compat hooks) |
| `ink-compat.md`   | `src/react.ts`, `src/hooks.ts`, `src/focus.ts`                    |
| `raw-buffer.md`   | `index.d.ts`, `src/inline.ts`                                     |
| `distribution.md` | `sea/`, `builds/sea/`                                             |
| `render-loop.md`  | `src/react.ts` (render loop impl)                                 |
| `decisions.md`    | Architecture log — update manually when design changes            |

## Update checklist

When a hook, component, or API changes:

1. Update the relevant reference page (`components.md`, `hooks.md`, `ink-compat.md`)
2. Update `getting-started.md` if the install/run story changed
3. Update `examples.md` if an example was added, removed, or renamed
4. Verify all internal links still resolve
5. Run the relevant example to confirm it still works

## Adding a new page

1. Create `docs/<name>.md`
2. Add it to `docs/index.md` under the appropriate section
3. Link to it from any related pages (e.g. from `hooks.md` if it's hook-related)

## GitHub Pages config

Pages is configured in `docs/_config.yml` (Jekyll, `minima` theme).  
Source: `main` branch, `/docs` folder (set in GitHub repo settings → Pages).
