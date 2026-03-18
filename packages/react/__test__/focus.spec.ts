/**
 * Tests for Newline, Spacer, useStdin, useFocus, useFocusManager
 */
import test from 'ava'
import React, { createElement, act } from 'react'
import { create as createTestRenderer } from 'react-test-renderer'
import EventEmitter from 'eventemitter3'

import { RatatatContext } from '../dist/hooks.js'
import { FocusProvider, FocusContext, useFocus, useFocusManager } from '../dist/focus.js'
import { Newline, Spacer } from '../dist/react.js'

// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// AVA runs tests in a file concurrently by default.
// React's act() + test-renderer share global scheduler state, so focus tests
// that use async act() must run serially to avoid interference.
const serialTest = test.serial

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx() {
  const emitter = new EventEmitter()
  return { app: { on: () => {}, off: () => {}, getSize: () => ({ width: 80, height: 24 }) }, input: emitter }
}

// ─── Newline ──────────────────────────────────────────────────────────────────

test('Newline: renders a text node with a single newline by default', async (t) => {
  let rendered: any
  await act(async () => {
    rendered = createTestRenderer(createElement(Newline))
  })
  const json = rendered.toJSON()
  t.is(json?.type, 'text')
  t.deepEqual(json?.children, ['\n'])
})

test('Newline: count prop repeats newline', async (t) => {
  let rendered: any
  await act(async () => {
    rendered = createTestRenderer(createElement(Newline, { count: 3 }))
  })
  const json = rendered.toJSON()
  t.deepEqual(json?.children, ['\n\n\n'])
})

// ─── Spacer ───────────────────────────────────────────────────────────────────

test('Spacer: renders a box with flexGrow=1', async (t) => {
  let rendered: any
  await act(async () => {
    rendered = createTestRenderer(createElement(Spacer))
  })
  const json = rendered.toJSON()
  t.is(json?.type, 'box')
  t.is(json?.props?.flexGrow, 1)
})

// ─── FocusProvider: add / remove ─────────────────────────────────────────────

serialTest('FocusProvider: first registered component gets focus automatically', async (t) => {
  let capturedCtx: any = null

  function Probe() {
    capturedCtx = React.useContext(FocusContext)
    useFocus()
    return null
  }

  await act(async () => {
    createTestRenderer(createElement(FocusProvider, null, createElement(Probe)))
  })

  t.truthy(capturedCtx?.activeId, 'first component auto-focused')
})

serialTest('FocusProvider: two components, first gets focus', async (t) => {
  const ids: string[] = []
  let ctx: any = null

  function A() {
    const { isFocused } = useFocus()
    if (isFocused) ids.push('A')
    return null
  }

  function B() {
    useFocus()
    return null
  }

  function Root() {
    ctx = React.useContext(FocusContext)
    return React.createElement(React.Fragment, null, createElement(A), createElement(B))
  }

  await act(async () => {
    createTestRenderer(createElement(FocusProvider, null, createElement(Root)))
  })

  // First registered item (A) should be focused
  t.true(ids.includes('A'), 'first component is focused')
})

// ─── useFocusManager: focusNext / focusPrevious ───────────────────────────────

serialTest('useFocusManager: focusNext cycles through components', async (t) => {
  const managerRef = { current: null as any }
  const focusedLog: string[] = []

  function Watched({ label }: { label: string }) {
    const { isFocused } = useFocus()
    React.useEffect(() => {
      if (isFocused) focusedLog.push(label)
    })
    return null
  }

  function Root() {
    managerRef.current = useFocusManager()
    return React.createElement(
      React.Fragment,
      null,
      createElement(Watched, { label: 'A' }),
      createElement(Watched, { label: 'B' }),
      createElement(Watched, { label: 'C' }),
    )
  }

  await act(async () => {
    createTestRenderer(createElement(FocusProvider, null, createElement(Root)))
  })

  // A is focused first (auto-focus)
  await act(async () => {
    managerRef.current.focusNext()
  })
  await act(async () => {
    managerRef.current.focusNext()
  })

  t.true(focusedLog.includes('A'), 'A was focused')
  t.true(focusedLog.includes('B'), 'B was focused after Tab')
  t.true(focusedLog.includes('C'), 'C was focused after second Tab')
})

serialTest('useFocusManager: focus(id) jumps directly to named component', async (t) => {
  const managerRef = { current: null as any }
  let focusedId: string | undefined

  function Watched({ id }: { id: string }) {
    const { isFocused } = useFocus({ id })
    React.useEffect(() => {
      if (isFocused) focusedId = id
    })
    return null
  }

  function Root() {
    managerRef.current = useFocusManager()
    return React.createElement(
      React.Fragment,
      null,
      createElement(Watched, { id: 'alpha' }),
      createElement(Watched, { id: 'beta' }),
    )
  }

  await act(async () => {
    createTestRenderer(createElement(FocusProvider, null, createElement(Root)))
  })

  await act(async () => {
    managerRef.current.focus('beta')
  })
  t.is(focusedId, 'beta', 'focus(id) jumps to beta')
})

serialTest('useFocusManager: activeId reflects current focus', async (t) => {
  const managerRef = { current: null as any }

  function A() {
    useFocus({ id: 'a' })
    return null
  }
  function B() {
    useFocus({ id: 'b' })
    return null
  }

  function Root() {
    managerRef.current = useFocusManager()
    return React.createElement(React.Fragment, null, createElement(A), createElement(B))
  }

  await act(async () => {
    createTestRenderer(createElement(FocusProvider, null, createElement(Root)))
  })

  t.is(managerRef.current.activeId, 'a', 'initial activeId is first registered (a)')

  await act(async () => {
    managerRef.current.focusNext()
  })
  t.is(managerRef.current.activeId, 'b', 'after focusNext, activeId is b')
})

// ─── useFocusManager: enableFocus / disableFocus ──────────────────────────────

serialTest('useFocusManager: disableFocus clears activeId', async (t) => {
  const managerRef = { current: null as any }

  function A() {
    useFocus({ id: 'x' })
    return null
  }
  function Root() {
    managerRef.current = useFocusManager()
    return createElement(A)
  }

  await act(async () => {
    createTestRenderer(createElement(FocusProvider, null, createElement(Root)))
  })

  t.is(managerRef.current.activeId, 'x', 'focused before disable')

  await act(async () => {
    managerRef.current.disableFocus()
  })
  t.is(managerRef.current.activeId, undefined, 'activeId cleared after disableFocus')
})
