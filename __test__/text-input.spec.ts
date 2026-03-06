import test from 'ava'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { RatatatContext, useTextInput } from '../dist/hooks.js'
import EventEmitter from 'eventemitter3'

// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Tests use React act() and must run serially to avoid act() environment conflicts
const serialTest = test.serial

// ─── Minimal context stub ────────────────────────────────────────────────────

function makeContext() {
  const input = new EventEmitter() as any
  const app = new EventEmitter() as any
  app.quit = () => {}
  app.getSize = () => ({ width: 80, height: 24 })
  const ctx = { app, input, writeStdout: () => {}, writeStderr: () => {} }
  return { input, app, ctx }
}

function Wrapper({ ctx, children }: { ctx: any; children: React.ReactNode }) {
  return React.createElement(RatatatContext.Provider, { value: ctx }, children)
}

async function renderTextInput(opts: any = {}) {
  const { ctx, input } = makeContext()
  let result: any = null

  function TestComponent() {
    result = useTextInput(opts)
    return null
  }

  let renderer: any
  await React.act(async () => {
    renderer = create(React.createElement(Wrapper, { ctx }, React.createElement(TestComponent)))
  })

  const emitKey = async (char: string) => {
    await React.act(async () => {
      input.emit('data', char)
    })
  }
  const emitKeydown = async (name: string) => {
    await React.act(async () => {
      input.emit('keydown', name)
    })
  }
  const emitCtrl = async (letter: string) => {
    await React.act(async () => {
      input.emit('ctrl', letter)
      input.emit('data', String.fromCharCode(letter.charCodeAt(0) - 96), { ctrl: true })
    })
  }
  const emitPaste = async (text: string) => {
    await React.act(async () => {
      input.emit('paste', text)
    })
  }

  return { renderer, get: () => result, emitKey, emitKeydown, emitCtrl, emitPaste }
}

// ─── Initial state ────────────────────────────────────────────────────────────

serialTest('useTextInput: initial value is empty string', async (t) => {
  const { get } = await renderTextInput()
  t.is(get().value, '')
  t.is(get().cursor, 0)
})

serialTest('useTextInput: initialValue option is used', async (t) => {
  const { get } = await renderTextInput({ initialValue: 'hello' })
  t.is(get().value, 'hello')
  t.is(get().cursor, 5)
})

// ─── Character input ──────────────────────────────────────────────────────────

serialTest('useTextInput: typing a character appends it', async (t) => {
  const { get, emitKey } = await renderTextInput()
  await emitKey('a')
  t.is(get().value, 'a')
  t.is(get().cursor, 1)
})

serialTest('useTextInput: typing multiple characters builds string', async (t) => {
  const { get, emitKey } = await renderTextInput()
  await emitKey('h')
  await emitKey('i')
  t.is(get().value, 'hi')
  t.is(get().cursor, 2)
})

// ─── Backspace / Delete ───────────────────────────────────────────────────────

serialTest('useTextInput: backspace removes character before cursor', async (t) => {
  const { get, emitKeydown } = await renderTextInput({ initialValue: 'ab' })
  await emitKeydown('backspace')
  t.is(get().value, 'a')
  t.is(get().cursor, 1)
})

serialTest('useTextInput: backspace at start does nothing', async (t) => {
  const { get, emitKeydown } = await renderTextInput()
  await emitKeydown('backspace')
  t.is(get().value, '')
  t.is(get().cursor, 0)
})

serialTest('useTextInput: delete removes character after cursor', async (t) => {
  const { get, emitKeydown } = await renderTextInput({ initialValue: 'ab' })
  await emitKeydown('left') // cursor=1
  await emitKeydown('delete') // removes 'b'
  t.is(get().value, 'a')
  t.is(get().cursor, 1)
})

serialTest('useTextInput: delete at end does nothing', async (t) => {
  const { get, emitKeydown } = await renderTextInput({ initialValue: 'ab' })
  await emitKeydown('delete')
  t.is(get().value, 'ab')
  t.is(get().cursor, 2)
})

// ─── Cursor movement ──────────────────────────────────────────────────────────

serialTest('useTextInput: left arrow moves cursor back', async (t) => {
  const { get, emitKeydown } = await renderTextInput({ initialValue: 'ab' })
  await emitKeydown('left')
  t.is(get().cursor, 1)
})

serialTest('useTextInput: right arrow moves cursor forward', async (t) => {
  const { get, emitKeydown } = await renderTextInput({ initialValue: 'ab' })
  await emitKeydown('left')
  await emitKeydown('right')
  t.is(get().cursor, 2)
})

serialTest('useTextInput: left arrow at start clamps to 0', async (t) => {
  const { get, emitKeydown } = await renderTextInput()
  await emitKeydown('left')
  t.is(get().cursor, 0)
})

serialTest('useTextInput: right arrow at end clamps to length', async (t) => {
  const { get, emitKeydown } = await renderTextInput({ initialValue: 'ab' })
  await emitKeydown('right')
  t.is(get().cursor, 2)
})

serialTest('useTextInput: home moves cursor to 0', async (t) => {
  const { get, emitKeydown } = await renderTextInput({ initialValue: 'hello' })
  await emitKeydown('home')
  t.is(get().cursor, 0)
})

serialTest('useTextInput: end moves cursor to end', async (t) => {
  const { get, emitKeydown } = await renderTextInput({ initialValue: 'hello' })
  await emitKeydown('home')
  await emitKeydown('end')
  t.is(get().cursor, 5)
})

// ─── Insert at cursor ─────────────────────────────────────────────────────────

serialTest('useTextInput: typing inserts at cursor position', async (t) => {
  const { get, emitKey, emitKeydown } = await renderTextInput({ initialValue: 'ac' })
  await emitKeydown('left') // cursor=1
  await emitKey('b') // insert 'b' between 'a' and 'c'
  t.is(get().value, 'abc')
  t.is(get().cursor, 2)
})

// ─── Ctrl shortcuts ───────────────────────────────────────────────────────────

serialTest('useTextInput: Ctrl+U kills to start of line', async (t) => {
  const { get, emitCtrl } = await renderTextInput({ initialValue: 'hello' })
  await emitCtrl('u')
  t.is(get().value, '')
  t.is(get().cursor, 0)
})

serialTest('useTextInput: Ctrl+K kills to end of line', async (t) => {
  const { get, emitCtrl, emitKeydown } = await renderTextInput({ initialValue: 'hello' })
  await emitKeydown('home')
  await emitCtrl('k')
  t.is(get().value, '')
  t.is(get().cursor, 0)
})

serialTest('useTextInput: Ctrl+W kills word before cursor', async (t) => {
  const { get, emitCtrl } = await renderTextInput({ initialValue: 'foo bar' })
  await emitCtrl('w')
  t.is(get().value, 'foo ')
  t.is(get().cursor, 4)
})

serialTest('useTextInput: Ctrl+A moves to start', async (t) => {
  const { get, emitCtrl } = await renderTextInput({ initialValue: 'hello' })
  await emitCtrl('a')
  t.is(get().cursor, 0)
})

serialTest('useTextInput: Ctrl+E moves to end', async (t) => {
  const { get, emitCtrl, emitKeydown } = await renderTextInput({ initialValue: 'hello' })
  await emitKeydown('home')
  await emitCtrl('e')
  t.is(get().cursor, 5)
})

// ─── Submit ───────────────────────────────────────────────────────────────────

serialTest('useTextInput: enter calls onSubmit with current value', async (t) => {
  let submitted = ''
  const { emitKeydown } = await renderTextInput({
    initialValue: 'hello',
    onSubmit: (v: string) => {
      submitted = v
    },
  })
  await emitKeydown('enter')
  t.is(submitted, 'hello')
})

// ─── onChange ─────────────────────────────────────────────────────────────────

serialTest('useTextInput: onChange called on each keystroke', async (t) => {
  const changes: string[] = []
  const { emitKey } = await renderTextInput({
    onChange: (v: string) => changes.push(v),
  })
  await emitKey('a')
  await emitKey('b')
  t.deepEqual(changes, ['a', 'ab'])
})

// ─── setValue / clear ─────────────────────────────────────────────────────────

serialTest('useTextInput: setValue updates value and moves cursor to end', async (t) => {
  const { get } = await renderTextInput()
  await React.act(async () => {
    get().setValue('world')
  })
  t.is(get().value, 'world')
  t.is(get().cursor, 5)
})

serialTest('useTextInput: clear resets to empty', async (t) => {
  const { get } = await renderTextInput({ initialValue: 'hello' })
  await React.act(async () => {
    get().clear()
  })
  t.is(get().value, '')
  t.is(get().cursor, 0)
})

// ─── isActive=false ───────────────────────────────────────────────────────────

serialTest('useTextInput: isActive=false ignores input', async (t) => {
  const { get, emitKey } = await renderTextInput({ isActive: false })
  await emitKey('a')
  t.is(get().value, '')
})

// ─── Paste ────────────────────────────────────────────────────────────────────

serialTest('useTextInput: paste inserts text at cursor', async (t) => {
  const { get, emitPaste } = await renderTextInput()
  await emitPaste('pasted text')
  t.is(get().value, 'pasted text')
  t.is(get().cursor, 11)
})

serialTest('useTextInput: paste strips control characters', async (t) => {
  const { get, emitPaste } = await renderTextInput()
  await emitPaste('hel\x00lo') // null byte stripped
  t.is(get().value, 'hello')
})
