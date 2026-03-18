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

// ─── T5: app.ts render interface ─────────────────────────────────────────────

test('start() + stop() lifecycle works', (t) => {
  const app = new TestApp()
  app.start()
  // @ts-ignore
  t.true(app.isRunning)
  app.stop()
  // @ts-ignore
  t.false(app.isRunning)
})

test('paintNow() is a no-op before start()', (t) => {
  const app = new TestApp()
  let called = false
  t.notThrows(() => {
    app.paintNow(
      () => {
        called = true
      },
      () => {},
    )
  })
  t.false(called, 'calculateLayout not called when not running')
})

test('paintNow() calls calculateLayout and renderToBuffer when running', (t) => {
  const app = new TestApp()
  app.start()

  let layoutCalled = false
  let renderCalled = false

  // paintNow will call renderer.render(backBuffer) — TestApp skips the N-API
  // terminal but renderer.render is still live. Wrap in notThrows.
  t.notThrows(() => {
    app.paintNow(
      () => {
        layoutCalled = true
      },
      () => {
        renderCalled = true
      },
    )
  })

  t.true(layoutCalled, 'calculateLayout called')
  t.true(renderCalled, 'renderToBuffer called')
  app.stop()
})

test('paintNow() wraps frame writes with DEC 2026 synchronized output', (t) => {
  const app = new TestApp() as any
  app.start()

  const calls: string[] = []
  app.renderer = {
    writeRaw(data: string) {
      calls.push(`writeRaw:${data}`)
    },
    render(_buffer: Uint32Array) {
      calls.push('render')
    },
  }

  app.paintNow(
    () => {},
    () => {},
  )

  t.deepEqual(calls, ['writeRaw:\x1b[?2026h', 'render', 'writeRaw:\x1b[?2026l'])
  app.stop()
})

test('paintNow() is a no-op after stop()', (t) => {
  const app = new TestApp()
  app.start()
  app.stop()

  let called = false
  t.notThrows(() => {
    app.paintNow(
      () => {
        called = true
      },
      () => {},
    )
  })
  t.false(called, 'calculateLayout not called after stop()')
})

test('start() is idempotent — double start() does not throw', (t) => {
  const app = new TestApp()
  t.notThrows(() => {
    app.start()
    app.start()
  })
  app.stop()
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
