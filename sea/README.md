# SEA (Single Executable Application) builds

This folder contains tooling to build standalone Node SEA binaries for demos.

## Build (macOS arm64)

```bash
npm run build
npm run build:sea:kitchen-sink
npm run build:sea:stress-test
```

Output:

- `builds/sea/macos-arm64/ratatat-kitchen-sink`
- `builds/sea/macos-arm64/SHA256SUMS.txt`
- `builds/sea/macos-arm64/ratatat-stress-test`
- `builds/sea/macos-arm64/SHA256SUMS-stress-test.txt`

## Notes

- Uses Node SEA (`node --build-sea` when available).
- On Node 23/24, falls back to `--experimental-sea-config` + local `postject` dev dependency.
- Includes Ratatat native addon (`ratatat.darwin-arm64.node`) as SEA asset.
- Includes `yoga-layout-prebuilt` as an externalized runtime asset tree.
- Binary output is gitignored (`builds/sea/`).
