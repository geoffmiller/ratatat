// sea/shims/native-index.cjs
// Shim used by esbuild when bundling examples for SEA.
// Replaces imports of ../index.js with a CJS module that loads native.cjs
// without relying on import.meta.

const native = require('./native.cjs')

module.exports = {
  Renderer: native.Renderer,
  TerminalGuard: native.TerminalGuard,
  terminalSize: native.terminalSize,
}
