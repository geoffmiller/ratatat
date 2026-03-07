# SEA demo binaries

This folder is for locally generated SEA (Single Executable Application) binaries.

Current demo binaries (macOS arm64):

- `macos-arm64/ratatat-kitchen-sink`
- `macos-arm64/ratatat-stress-test`

## Build them

From repo root:

```bash
npm run build
npm run build:sea:kitchen-sink
npm run build:sea:stress-test
```

See [docs/distribution.md](../../docs/distribution.md) for full build instructions, safety verification checklist, and how to add new SEA targets.

## Run them

```bash
./builds/sea/macos-arm64/ratatat-kitchen-sink
./builds/sea/macos-arm64/ratatat-stress-test
```

Use a real TTY (Terminal.app, iTerm, Ghostty). Running from non-TTY contexts can fail.

## Safety warning (important)

Do **not** run random binaries from the internet without verification.

Before running a downloaded binary, at minimum:

1. Verify source/trust (who built it?)
2. Verify checksum (e.g. compare to published SHA256)
3. Prefer building from source yourself when possible
4. On macOS, inspect signature if provided (`codesign -dv --verbose=4 <binary>`)

If in doubt, rebuild locally from this repository instead of executing an unknown binary.
