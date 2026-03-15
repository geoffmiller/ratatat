# Local Build Artifacts

This folder stores manually generated test artifacts for local validation.

## macOS arm64 build

- Package: `macos-arm64/ratatat-0.1.1-macos-arm64.tar.gz`
- Checksum: `macos-arm64/SHA256SUMS.txt`

## Verify checksum

From repo root:

```bash
# macOS
shasum -a 256 -c builds/macos-arm64/SHA256SUMS.txt

# Linux
sha256sum -c builds/macos-arm64/SHA256SUMS.txt
```

Expected output includes `OK` for the tarball line.

If your artifact is in a different location, compute and compare manually:

```bash
shasum -a 256 /path/to/ratatat-0.1.1-macos-arm64.tar.gz
cat builds/macos-arm64/SHA256SUMS.txt
```

Match the hash value exactly before installing.

## Install/Test locally

```bash
npm install ./builds/macos-arm64/ratatat-0.1.1-macos-arm64.tar.gz
```

Quick smoke test:

```bash
node --input-type=module -e "import React from 'react'; import { renderToString } from 'ratatat'; console.log(renderToString(React.createElement('text', {}, 'ok')));"
```

## Regenerate

From repo root:

```bash
npm run build
npm pack
mkdir -p builds/macos-arm64
mv -f ratatat-0.1.1.tgz builds/macos-arm64/ratatat-0.1.1-macos-arm64.tar.gz
shasum -a 256 builds/macos-arm64/ratatat-0.1.1-macos-arm64.tar.gz > builds/macos-arm64/SHA256SUMS.txt
```
