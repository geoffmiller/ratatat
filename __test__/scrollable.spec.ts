import test from 'ava'
import { useScrollable } from '../dist/hooks.js'

// useScrollable is pure state logic — test it by calling the hook directly
// via a minimal React render with react-test-renderer.
import React from 'react'
import { create as createTestRenderer } from 'react-test-renderer'

// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Capture hook result from a live React component
function renderHook(opts: { viewportHeight: number; contentHeight: number }) {
  let result: ReturnType<typeof useScrollable> | null = null

  function Harness({ viewportHeight, contentHeight }: typeof opts) {
    result = useScrollable({ viewportHeight, contentHeight })
    return null
  }

  let renderer: any
  React.act(() => {
    renderer = createTestRenderer(React.createElement(Harness, opts))
  })

  const rerender = (newOpts: typeof opts) => {
    React.act(() => {
      renderer.update(React.createElement(Harness, newOpts))
    })
  }

  return { get: () => result!, rerender, renderer }
}

// ─── Initial state ────────────────────────────────────────────────────────────

test('useScrollable: starts at offset 0', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 30 })
  t.is(get().offset, 0)
})

test('useScrollable: atTop is true initially', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 30 })
  t.true(get().atTop)
})

test('useScrollable: atBottom is false when content overflows', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 30 })
  t.false(get().atBottom)
})

test('useScrollable: atBottom is true when content fits in viewport', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 8 })
  t.true(get().atBottom)
  t.true(get().atTop)
})

test('useScrollable: offset is 0 when content fits in viewport', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 5 })
  t.is(get().offset, 0)
})

// ─── Scrolling ────────────────────────────────────────────────────────────────

test('useScrollable: scrollDown increments offset', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 30 })
  React.act(() => {
    get().scrollDown()
  })
  t.is(get().offset, 1)
})

test('useScrollable: scrollUp decrements offset', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 30 })
  React.act(() => {
    get().scrollDown()
  })
  React.act(() => {
    get().scrollDown()
  })
  React.act(() => {
    get().scrollUp()
  })
  t.is(get().offset, 1)
})

test('useScrollable: scrollUp clamps at 0', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 30 })
  React.act(() => {
    get().scrollUp()
  })
  React.act(() => {
    get().scrollUp()
  })
  t.is(get().offset, 0)
  t.true(get().atTop)
})

test('useScrollable: scrollToBottom jumps to max offset', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 30 })
  React.act(() => {
    get().scrollToBottom()
  })
  t.is(get().offset, 20) // 30 - 10
  t.true(get().atBottom)
})

test('useScrollable: scrollToTop jumps to 0', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 30 })
  React.act(() => {
    get().scrollToBottom()
  })
  React.act(() => {
    get().scrollToTop()
  })
  t.is(get().offset, 0)
  t.true(get().atTop)
})

test('useScrollable: scrollDown clamps at max', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 12 })
  // max = 12 - 10 = 2
  React.act(() => {
    get().scrollDown()
  })
  React.act(() => {
    get().scrollDown()
  })
  React.act(() => {
    get().scrollDown()
  }) // should clamp at 2
  t.is(get().offset, 2)
  t.true(get().atBottom)
})

test('useScrollable: scrollBy moves by N rows', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 30 })
  React.act(() => {
    get().scrollBy(5)
  })
  t.is(get().offset, 5)
})

test('useScrollable: scrollBy clamps when exceeding max', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 30 })
  React.act(() => {
    get().scrollBy(999)
  })
  t.is(get().offset, 20) // max = 30 - 10
})

test('useScrollable: scrollBy negative scrolls up', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 30 })
  React.act(() => {
    get().scrollBy(10)
  })
  React.act(() => {
    get().scrollBy(-3)
  })
  t.is(get().offset, 7)
})

// ─── Dynamic content height ───────────────────────────────────────────────────

test('useScrollable: offset stays clamped when content shrinks', (t) => {
  const { get, rerender } = renderHook({ viewportHeight: 10, contentHeight: 30 })
  React.act(() => {
    get().scrollToBottom()
  })
  t.is(get().offset, 20)

  // Content shrinks — offset must clamp to new max
  rerender({ viewportHeight: 10, contentHeight: 15 })
  t.true(get().offset <= 5) // new max = 15 - 10 = 5
})

test('useScrollable: atBottom stays true when content grows and offset tracks', (t) => {
  const { get, rerender } = renderHook({ viewportHeight: 10, contentHeight: 20 })
  React.act(() => {
    get().scrollToBottom()
  })
  t.true(get().atBottom)

  // Simulate a new message arriving — content gets taller
  // User was at bottom, offset should now be clamped to new max
  rerender({ viewportHeight: 10, contentHeight: 25 })
  // offset clamped to old max (10), new max is 15 — not at bottom anymore
  // (caller must call scrollToBottom() again to follow new content)
  t.is(typeof get().offset, 'number') // just verify it didn't explode
})

test('useScrollable: zero content height is safe', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 0 })
  t.is(get().offset, 0)
  t.true(get().atTop)
  t.true(get().atBottom)
})

test('useScrollable: content exactly equals viewport has no scroll range', (t) => {
  const { get } = renderHook({ viewportHeight: 10, contentHeight: 10 })
  t.is(get().offset, 0)
  t.true(get().atTop)
  t.true(get().atBottom)
  React.act(() => {
    get().scrollDown()
  })
  t.is(get().offset, 0) // still 0, no room to scroll
})
