// ESM wrapper around the NAPI-RS CJS native binding
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const native = require('./native.cjs');

export const { Renderer, TerminalGuard, terminalSize } = native;
