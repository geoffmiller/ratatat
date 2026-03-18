![Ratatat logo](packages/docs/media/ratatat-logo.png)

# Ratatat Monorepo

> 100% vibe code. Fork/clone only - no PRs

Ratatat is now organized as a monorepo with separate packages for core runtime, React APIs, Ink-fast research implementation, and unified docs.

## Packages

| Package                            | Purpose                                                                                                                  | More info                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| [`@ratatat/core`](packages/core)   | Native Rust diff engine bindings + framework-agnostic runtime (`Renderer`, `TerminalGuard`, `InputParser`, `RatatatApp`) | [`packages/core/README.md`](packages/core/README.md)   |
| [`@ratatat/react`](packages/react) | React adapter and Ink-compatible component/hook API                                                                      | [`packages/react/README.md`](packages/react/README.md) |
| [`@ratatat/ink`](packages/ink)     | `ink-fast` implementation and performance research fork                                                                  | [`packages/ink/readme.md`](packages/ink/readme.md)     |
| [`@ratatat/docs`](packages/docs)   | Unified docs for all packages (private workspace package)                                                                | [`packages/docs/index.md`](packages/docs/index.md)     |

## Workspace commands

From repo root:

```bash
npm install
npm run build
npm test
```

Target a package:

```bash
npm run build -w @ratatat/core
npm run test -w @ratatat/react
npm run bench:render -w @ratatat/ink
```

## Docs entry points

- [Docs index](packages/docs/index.md)
- [Getting started](packages/docs/getting-started.md)
- [React quickstart](packages/docs/quickstart-react.md)
- [Raw-buffer quickstart](packages/docs/quickstart-raw-buffer.md)
