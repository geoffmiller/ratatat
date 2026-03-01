import test from 'ava'
import { RatatatApp } from '../dist/app.js'

// ─── TestApp: subclass that stubs out N-API terminal calls ───────────────────
// TerminalSetup.enter/leave/getSize are N-API methods that can't be monkeypatched.
// We subclass RatatatApp and override start()/stop() to bypass the terminal.

class TestApp extends RatatatApp {
  // Override start — skip TerminalSetup.enter(), just set isRunning
  start() {
    // @ts-ignore — accessing private field for test isolation
    if (this.isRunning) return
    // @ts-ignore
    this.isRunning = true
  }

  stop() {
    // @ts-ignore
    this.isRunning = false
  }
}

// ─── T5: app.ts event-driven only ────────────────────────────────────────────

test('start() + 100ms wait → "render" event NOT fired (no polling loop)', async (t) => {
  const app = new TestApp()
  let renderCount = 0
  app.on('render', () => { renderCount++ })

  app.start()

  await new Promise(resolve => setTimeout(resolve, 100))

  t.is(renderCount, 0, 'no render fired without requestRender()')
  app.stop()
})

test('requestRender() → "render" fires once on next tick', async (t) => {
  const app = new TestApp()
  let renderCount = 0
  app.on('render', () => { renderCount++ })

  app.start()
  app.requestRender()

  await new Promise(resolve => setTimeout(resolve, 50))

  t.is(renderCount, 1, 'render fired exactly once')
  app.stop()
})

test('two requestRender() calls before tick → render fires exactly once', async (t) => {
  const app = new TestApp()
  let renderCount = 0
  app.on('render', () => { renderCount++ })

  app.start()
  app.requestRender()
  app.requestRender()

  await new Promise(resolve => setTimeout(resolve, 50))

  t.is(renderCount, 1, 'debounce: only one render despite two requestRender calls')
  app.stop()
})

test('requestRender() after stop() → render does NOT fire', async (t) => {
  const app = new TestApp()
  let renderCount = 0
  app.on('render', () => { renderCount++ })

  app.start()
  app.stop()
  app.requestRender()

  await new Promise(resolve => setTimeout(resolve, 50))

  t.is(renderCount, 0, 'no render after stop()')
})

test('getBuffer() returns a Uint32Array', (t) => {
  const app = new TestApp()
  const buf = app.getBuffer()
  t.true(buf instanceof Uint32Array)
})

test('getSize() returns { width, height } with positive numbers', (t) => {
  const app = new TestApp()
  const size = app.getSize()
  t.true(size.width > 0)
  t.true(size.height > 0)
})

test('start() is idempotent — double start does not register double loop', async (t) => {
  const app = new TestApp()
  let renderCount = 0
  app.on('render', () => { renderCount++ })

  app.start()
  app.start()
  app.requestRender()

  await new Promise(resolve => setTimeout(resolve, 50))

  t.is(renderCount, 1, 'render fires once even after double start()')
  app.stop()
})
