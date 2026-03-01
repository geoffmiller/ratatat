// ESM re-export wrapper for the napi-rs CJS native loader
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const native = require('./index.cjs')
export const Renderer = native.Renderer
export const TerminalSetup = native.TerminalSetup
