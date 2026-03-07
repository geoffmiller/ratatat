// sea/bootstrap.cjs
// Injected SEA entrypoint. Reconstructs runtime files from SEA assets,
// then loads the bundled kitchen-sink app from disk.

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const sea = require('node:sea')
const { createRequire } = require('node:module')

if (!sea.isSea()) {
  throw new Error('bootstrap.cjs must run inside a SEA binary')
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ratatat-sea-'))

const cleanup = () => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  } catch {
    // best-effort cleanup
  }
}

process.on('exit', cleanup)
process.on('SIGINT', () => {
  cleanup()
  process.exit(130)
})
process.on('SIGTERM', () => {
  cleanup()
  process.exit(143)
})

const manifestText = sea.getAsset('runtime/__asset_manifest__.json', 'utf8')
const assetKeys = JSON.parse(manifestText)
for (const key of assetKeys) {
  const outPath = path.join(tmpRoot, key)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  const data = Buffer.from(sea.getAsset(key))
  fs.writeFileSync(outPath, data)
}

// Also write the manifest itself for debugging/inspection.
{
  const outPath = path.join(tmpRoot, 'runtime', '__asset_manifest__.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, Buffer.from(manifestText))
}

const runtimeDir = path.join(tmpRoot, 'runtime')
const appPath = path.join(runtimeDir, 'app.cjs')
if (!fs.existsSync(appPath)) {
  throw new Error('SEA asset extraction failed: missing runtime/app.cjs')
}

// Help native.cjs resolve quickly via explicit path.
const addon = fs.readdirSync(runtimeDir).find((f) => f.endsWith('.node'))
if (addon) {
  process.env.NAPI_RS_NATIVE_LIBRARY_PATH = path.join(runtimeDir, addon)
}

const fsRequire = createRequire(appPath)
fsRequire(appPath)
