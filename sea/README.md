# SEA (Single Executable Application) builds

This folder contains tooling to build a standalone Node SEA binary for the kitchen-sink demo.

## Build (macOS arm64)

```bash
npm run build
npm run build:sea:kitchen-sink
```

Output:

- `builds/sea/macos-arm64/ratatat-kitchen-sink`
- `builds/sea/macos-arm64/SHA256SUMS.txt`

## Notes

- Uses Node SEA (`node --build-sea`).
- Includes Ratatat native addon (`ratatat.darwin-arm64.node`) as SEA asset.
- Includes `yoga-layout-prebuilt` as an externalized runtime asset tree.
- Binary output is gitignored (`builds/sea/`).
