# Local Build Artifacts

This folder stores manually generated test artifacts for local validation.

## macOS arm64 build

- Package: `macos-arm64/ratatat-0.1.0-macos-arm64.tar.gz`
- Checksum: `macos-arm64/SHA256SUMS.txt`

## Install/Test locally

```bash
npm install ./builds/macos-arm64/ratatat-0.1.0-macos-arm64.tar.gz
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
mv -f ratatat-0.1.0.tgz builds/macos-arm64/ratatat-0.1.0-macos-arm64.tar.gz
shasum -a 256 builds/macos-arm64/ratatat-0.1.0-macos-arm64.tar.gz > builds/macos-arm64/SHA256SUMS.txt
```
