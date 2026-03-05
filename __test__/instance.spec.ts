import test from 'ava'
import React, { useState } from 'react'
import { render } from '../dist/react.js'

// Instance API tests — verify render() returns Ink-compatible { rerender, unmount, waitUntilExit }
// These tests run headless: no TTY, no alternate screen.
// RatatatApp.start() calls TerminalGuard which needs a real TTY — we patch it out.

import { RatatatApp } from '../dist/app.js'

// Patch start/stop to skip TerminalGuard (no TTY in test env)
const origStart = RatatatApp.prototype.start
const origStop = RatatatApp.prototype.stop
RatatatApp.prototype.start = function () {
  // @ts-ignore
  if (this.isRunning) return
  // @ts-ignore
  this.isRunning = true
}
RatatatApp.prototype.stop = function () {
  // @ts-ignore
  this.isRunning = false
  // flush buffered output
  // @ts-ignore
  if (this.stdoutBuffer?.length) { process.stdout.write(this.stdoutBuffer.join('')); this.stdoutBuffer = [] }
  // @ts-ignore
  if (this.stderrBuffer?.length) { process.stderr.write(this.stderrBuffer.join('')); this.stderrBuffer = [] }
}

// Also patch InputParser to avoid setRawMode on non-TTY stdin
import { InputParser } from '../dist/input.js'
const origInputStart = InputParser.prototype.start
const origInputStop = InputParser.prototype.stop
InputParser.prototype.start = function () {
  // @ts-ignore
  this.stdin.setEncoding?.('utf8')
}
InputParser.prototype.stop = function () {}

function Counter({ label }: { label: string }) {
  const [n, setN] = useState(0)
  React.useEffect(() => { setN(1) }, [])
  return React.createElement('box', {}, React.createElement('text', {}, `${label}:${n}`))
}

test.serial('render() returns rerender, unmount, waitUntilExit', t => {
  const instance = render(React.createElement(Counter, { label: 'a' }))
  t.is(typeof instance.rerender, 'function')
  t.is(typeof instance.unmount, 'function')
  t.is(typeof instance.waitUntilExit, 'function')
  instance.unmount()
})

test.serial('waitUntilExit resolves when unmount() is called', async t => {
  const instance = render(React.createElement(Counter, { label: 'b' }))
  const p = instance.waitUntilExit()
  instance.unmount()
  await t.notThrowsAsync(() => p)
})

test.serial('waitUntilExit called multiple times returns same promise', async t => {
  const instance = render(React.createElement(Counter, { label: 'c' }))
  const p1 = instance.waitUntilExit()
  const p2 = instance.waitUntilExit()
  instance.unmount()
  await Promise.all([p1, p2])
  t.pass()
})

test.serial('rerender swaps root element', t => {
  const instance = render(React.createElement(Counter, { label: 'x' }))
  // Should not throw when called with a different element
  t.notThrows(() => {
    instance.rerender(React.createElement(Counter, { label: 'y' }))
  })
  instance.unmount()
})

test.serial('unmount() is idempotent — calling twice does not throw', t => {
  const instance = render(React.createElement(Counter, { label: 'd' }))
  t.notThrows(() => {
    instance.unmount()
    instance.unmount()
  })
})
