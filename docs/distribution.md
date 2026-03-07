# Distribution

How to distribute apps built with Ratatat.

---

## npm package (standard usage)

Install and use as a regular npm dependency:

```bash
npm install ratatat
```

Ratatat ships with prebuilt native addons for:

| Platform | Arch                  |
| -------- | --------------------- |
| macOS    | arm64 (Apple Silicon) |
| macOS    | x64 (Intel)           |
| Linux    | x64                   |
| Linux    | arm64                 |
| Windows  | x64                   |

No build step required. The right `.node` file is selected automatically at runtime via `native.cjs`.

---

## SEA binaries (Single Executable Application)

For distributing a Ratatat app as a self-contained binary, Ratatat includes tooling to build Node SEA binaries — a single executable file with the app, runtime assets, and native addon all embedded.

> See also [`builds/sea/README.md`](../builds/sea/README.md) for quick run instructions.

### What's included in the binary

- The bundled app (esbuild output)
- The Ratatat native addon (`.node` file)
- `native.cjs` loader
- `yoga-layout-prebuilt` (Yoga WASM + JS)
- An asset manifest for extraction at runtime

### Build a SEA binary

From repo root, after `npm install` and `npm run build`:

```bash
# kitchen-sink demo
npm run build:sea:kitchen-sink

# stress-test demo
npm run build:sea:stress-test
```

Output:

```
builds/sea/macos-arm64/ratatat-kitchen-sink
builds/sea/macos-arm64/SHA256SUMS.txt
builds/sea/macos-arm64/ratatat-stress-test
builds/sea/macos-arm64/SHA256SUMS-stress-test.txt
```

Binary outputs are gitignored and produced locally only.

### Run a SEA binary

```bash
./builds/sea/macos-arm64/ratatat-kitchen-sink
./builds/sea/macos-arm64/ratatat-stress-test
```

**Requires a real TTY.** Running from a non-interactive context (redirected stdin/stdout) will fail with "Device not configured".

### Build your own SEA binary

The build scripts in `sea/` are the canonical template. To add a new target:

1. Copy `sea/build-kitchen-sink-sea.mjs`
2. Change `entryPoints` to your app's entry file
3. Update `outputBinary`, `tmpDir`, and `checksumFile` paths
4. Add a script entry in `package.json`
5. Run `npm run build:sea:<your-name>`

---

## ⚠️ Binary safety (important)

If you download a prebuilt binary from the internet — from this repo's releases or anywhere else — follow these steps before running it:

### 1. Verify the source

Only run binaries from sources you trust. Check that you are on the official repository at the expected URL. Beware of typosquatting.

### 2. Verify the checksum

Compare the binary's SHA256 hash against the published `SHA256SUMS.txt`:

```bash
# macOS
shasum -a 256 ratatat-kitchen-sink

# Linux
sha256sum ratatat-kitchen-sink
```

Compare the output against the value in `SHA256SUMS.txt`. If they don't match, do not run the binary.

### 3. Inspect the macOS signature (if applicable)

```bash
codesign -dv --verbose=4 ratatat-kitchen-sink
```

The binary is ad-hoc signed (not Apple-notarized). You may need to explicitly allow it the first time via System Preferences → Privacy & Security.

### 4. When in doubt, build from source

The safest option is always to build the binary yourself from the source code you have reviewed:

```bash
git clone https://github.com/geoffmiller/ratatat
cd ratatat
npm install
npm run build
npm run build:sea:kitchen-sink
```

---

## Node version compatibility

Ratatat requires Node.js ≥ 20. SEA binaries embed the full Node binary for the current version and do not depend on the host's Node installation.

The SEA build pipeline uses `--experimental-sea-config` + `postject` (Node 23/24 fallback path). When Node 25.5+ with `--build-sea` support is available, the pipeline will use the one-step flow automatically.
