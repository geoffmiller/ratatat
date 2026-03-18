/**
 * Tests for <Static> component
 *
 * Verifies:
 *  - First render: all items rendered
 *  - Incremental render: only new items rendered (old ones stay frozen)
 *  - Empty items: renders empty container
 *  - Style prop: forwarded to container box
 *  - Render function receives correct item + index
 */
import test from 'ava'
import React, { createElement, act } from 'react'
import { create as createTestRenderer } from 'react-test-renderer'
import { Static } from '../dist/static.js'

// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Static uses useLayoutEffect → must be serial (React scheduler global state)
const serialTest = test.serial

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Item = { id: number; label: string }

function makeItems(n: number): Item[] {
  return Array.from({ length: n }, (_, i) => ({ id: i, label: `item-${i}` }))
}

// ─── S1: Empty items ──────────────────────────────────────────────────────────

serialTest('Static: empty items renders container with no children', async (t) => {
  let renderer: any
  await act(async () => {
    renderer = createTestRenderer(
      createElement(Static, {
        items: [],
        children: (item: Item) => createElement('box', { key: item.id }, item.label),
      }),
    )
  })
  const json = renderer.toJSON()
  t.is(json?.type, 'box')
  t.is(json?.children, null)
})

// ─── S2: Initial render ───────────────────────────────────────────────────────

serialTest('Static: initial items all rendered on first mount', async (t) => {
  const items = makeItems(3)
  let renderer: any
  await act(async () => {
    renderer = createTestRenderer(
      createElement(Static, {
        items,
        children: (item: Item) => createElement('box', { key: item.id }, item.label),
      }),
    )
  })
  const json = renderer.toJSON()
  t.is(json?.type, 'box')
  // After first render, useLayoutEffect fires and sets lastIndex = items.length,
  // triggering a second render with empty new items. Children count = 3 from
  // the first pass (they're committed into the tree).
  t.is(json?.children?.length, 3)
})

// ─── S3: Incremental render ───────────────────────────────────────────────────

serialTest('Static: new items appended, old items unchanged', async (t) => {
  let items = makeItems(2)
  let renderer: any

  await act(async () => {
    renderer = createTestRenderer(
      createElement(Static, {
        items,
        children: (item: Item) => createElement('box', { key: item.id }, item.label),
      }),
    )
  })

  // Initial: 2 items committed
  let json = renderer.toJSON()
  t.is(json?.children?.length, 2)

  // Add 1 new item
  const newItem: Item = { id: 2, label: 'item-2' }
  items = [...items, newItem]

  await act(async () => {
    renderer.update(
      createElement(Static, {
        items,
        children: (item: Item) => createElement('box', { key: item.id }, item.label),
      }),
    )
  })

  json = renderer.toJSON()
  // 3 total: 2 frozen + 1 new
  t.is(json?.children?.length, 3)
})

// ─── S4: Render fn receives correct index ────────────────────────────────────

serialTest('Static: render fn receives item and correct index', async (t) => {
  const items = makeItems(3)
  const receivedArgs: Array<[Item, number]> = []

  await act(async () => {
    createTestRenderer(
      createElement(Static, {
        items,
        children: (item: Item, index: number) => {
          receivedArgs.push([item, index])
          return createElement('box', { key: item.id }, item.label)
        },
      }),
    )
  })

  // Should have been called for items 0, 1, 2 with correct indices
  const firstPass = receivedArgs.slice(0, 3)
  t.deepEqual(
    firstPass.map(([, i]) => i),
    [0, 1, 2],
  )
  t.deepEqual(
    firstPass.map(([item]) => item.label),
    ['item-0', 'item-1', 'item-2'],
  )
})

// ─── S5: Style prop forwarded ─────────────────────────────────────────────────

serialTest('Static: style prop forwarded to container box', async (t) => {
  let renderer: any
  await act(async () => {
    renderer = createTestRenderer(
      createElement(Static, {
        items: [],
        style: { paddingLeft: 2 },
        children: (item: Item) => createElement('box', { key: (item as any).id }),
      }),
    )
  })
  const json = renderer.toJSON()
  t.is(json?.type, 'box')
  t.is((json?.props as any)?.paddingLeft, 2)
  // flexDirection always set to 'column'
  t.is((json?.props as any)?.flexDirection, 'column')
})

// ─── S6: Multiple incremental additions ──────────────────────────────────────

serialTest('Static: multiple incremental additions accumulate correctly', async (t) => {
  let items: Item[] = []
  let renderer: any

  // Start empty
  await act(async () => {
    renderer = createTestRenderer(
      createElement(Static, {
        items,
        children: (item: Item) => createElement('box', { key: item.id }, item.label),
      }),
    )
  })
  t.is(renderer.toJSON()?.children, null)

  // Add 2
  items = makeItems(2)
  await act(async () => {
    renderer.update(
      createElement(Static, {
        items,
        children: (item: Item) => createElement('box', { key: item.id }, item.label),
      }),
    )
  })
  t.is(renderer.toJSON()?.children?.length, 2)

  // Add 2 more
  items = makeItems(4)
  await act(async () => {
    renderer.update(
      createElement(Static, {
        items,
        children: (item: Item) => createElement('box', { key: item.id }, item.label),
      }),
    )
  })
  t.is(renderer.toJSON()?.children?.length, 4)

  // Add 1 more
  items = makeItems(5)
  await act(async () => {
    renderer.update(
      createElement(Static, {
        items,
        children: (item: Item) => createElement('box', { key: item.id }, item.label),
      }),
    )
  })
  t.is(renderer.toJSON()?.children?.length, 5)
})
