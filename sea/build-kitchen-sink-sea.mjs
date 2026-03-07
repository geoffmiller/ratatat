import { build } from 'esbuild'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const require = createRequire(import.meta.url)
const postjectCli = require.resolve('postject/dist/cli.js')

const outDir = path.join(root, 'builds', 'sea', 'macos-arm64')
const tmpDir = path.join(root, 'sea', '.tmp', 'kitchen-sink-macos-arm64')
const runtimeDir = path.join(tmpDir, 'runtime')
const outputBinary = path.join(outDir, 'ratatat-kitchen-sink')
const checksumFile = path.join(outDir, 'SHA256SUMS.txt')

const addonName = 'ratatat.darwin-arm64.node'
const addonPath = path.join(root, addonName)
const nativeCjsPath = path.join(root, 'native.cjs')
const yogaPkgPath = path.join(root, 'node_modules', 'yoga-layout-prebuilt')
const bootstrapPath = path.join(root, 'sea', 'bootstrap.cjs')
const shimPath = path.join(root, 'sea', 'shims', 'native-index.cjs')

for (const p of [addonPath, nativeCjsPath, yogaPkgPath, bootstrapPath, shimPath]) {
  if (!existsSync(p)) {
    throw new Error(`Required file missing: ${p}`)
  }
}

rmSync(tmpDir, { recursive: true, force: true })
mkdirSync(runtimeDir, { recursive: true })
mkdirSync(outDir, { recursive: true })

// 1) Bundle kitchen-sink into one CJS file for SEA runtime.
await build({
  entryPoints: [path.join(root, 'examples', 'kitchen-sink.tsx')],
  outfile: path.join(runtimeDir, 'app.cjs'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: false,
  logLevel: 'info',
  external: ['yoga-layout-prebuilt', './native.cjs'],
  plugins: [
    {
      name: 'native-index-shim',
      setup(buildCtx) {
        buildCtx.onResolve({ filter: /^\.\.\/index\.js$/ }, () => ({ path: shimPath }))
      },
    },
  ],
})

// 2) Copy native runtime files and externalized package.
cpSync(nativeCjsPath, path.join(runtimeDir, 'native.cjs'))
cpSync(addonPath, path.join(runtimeDir, addonName))
cpSync(yogaPkgPath, path.join(runtimeDir, 'node_modules', 'yoga-layout-prebuilt'), { recursive: true })

// 3) Build SEA assets map from runtime directory.
const assets = {}
const walk = (relDir = '') => {
  const absDir = path.join(runtimeDir, relDir)
  for (const name of readdirSync(absDir)) {
    const childRel = path.join(relDir, name)
    const childAbs = path.join(runtimeDir, childRel)
    if (statSync(childAbs).isDirectory()) {
      walk(childRel)
      continue
    }
    const assetKey = path.posix.join('runtime', childRel.split(path.sep).join(path.posix.sep))
    assets[assetKey] = childAbs
  }
}
walk()

// Add explicit asset manifest for Node versions that don't expose sea.getAssetKeys().
const manifestKey = 'runtime/__asset_manifest__.json'
const manifestPath = path.join(runtimeDir, '__asset_manifest__.json')
writeFileSync(manifestPath, JSON.stringify(Object.keys(assets), null, 2))
assets[manifestKey] = manifestPath

// 4) Build SEA binary.
const supportsBuildSea = spawnSync(process.execPath, ['--help'], { encoding: 'utf8' }).stdout.includes('--build-sea')

if (supportsBuildSea) {
  // Node >= 25.5 one-step flow.
  const seaConfigPath = path.join(tmpDir, 'sea-config.json')
  writeFileSync(
    seaConfigPath,
    JSON.stringify(
      {
        main: bootstrapPath,
        mainFormat: 'commonjs',
        output: outputBinary,
        disableExperimentalSEAWarning: true,
        useSnapshot: false,
        useCodeCache: false,
        assets,
      },
      null,
      2,
    ),
  )

  const seaResult = spawnSync(process.execPath, ['--build-sea', seaConfigPath], {
    cwd: root,
    stdio: 'inherit',
  })
  if (seaResult.status !== 0) process.exit(seaResult.status ?? 1)
} else {
  // Node 23/24 fallback flow: generate blob then inject with postject.
  const blobPath = path.join(tmpDir, 'sea-prep.blob')
  const prepConfigPath = path.join(tmpDir, 'sea-prep-config.json')

  writeFileSync(
    prepConfigPath,
    JSON.stringify(
      {
        main: bootstrapPath,
        output: blobPath,
        disableExperimentalSEAWarning: true,
        useSnapshot: false,
        useCodeCache: false,
        assets,
      },
      null,
      2,
    ),
  )

  const prep = spawnSync(process.execPath, ['--experimental-sea-config', prepConfigPath], {
    cwd: root,
    stdio: 'inherit',
  })
  if (prep.status !== 0) process.exit(prep.status ?? 1)

  cpSync(process.execPath, outputBinary)

  if (process.platform === 'darwin') {
    // Binary must be unsigned before injection.
    spawnSync('codesign', ['--remove-signature', outputBinary], { stdio: 'inherit' })
  }

  const postjectArgs = [
    postjectCli,
    outputBinary,
    'NODE_SEA_BLOB',
    blobPath,
    '--sentinel-fuse',
    'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  ]
  if (process.platform === 'darwin') {
    postjectArgs.push('--macho-segment-name', 'NODE_SEA')
  }

  const inject = spawnSync(process.execPath, postjectArgs, { cwd: root, stdio: 'inherit' })
  if (inject.status !== 0) process.exit(inject.status ?? 1)
}

// 5) Ad-hoc sign on macOS (required by kernel policy on modern macOS).
if (process.platform === 'darwin') {
  const sign = spawnSync('codesign', ['--sign', '-', outputBinary], { stdio: 'inherit' })
  if (sign.status !== 0) {
    console.warn('Warning: codesign failed. Binary may not run on macOS without signing.')
  }
}

// 6) Checksum output.
const digest = createHash('sha256').update(readFileSync(outputBinary)).digest('hex')
writeFileSync(checksumFile, `${digest}  ${path.basename(outputBinary)}\n`)

console.log('\nSEA kitchen-sink binary built:')
console.log(`  ${outputBinary}`)
console.log('Checksum:')
console.log(`  ${checksumFile}`)
