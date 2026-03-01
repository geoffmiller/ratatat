import test from 'ava'
import { resolveColor, NAMED_COLORS } from '../dist/styles.js'

// ─── resolveColor ─────────────────────────────────────────────────────────────

test('resolveColor: undefined → 255 (terminal default)', t => {
  t.is(resolveColor(undefined), 255)
})

test('resolveColor: number pass-through', t => {
  t.is(resolveColor(0), 0)
  t.is(resolveColor(3), 3)
  t.is(resolveColor(255), 255)
})

test('resolveColor: named color "black" → 0', t => {
  t.is(resolveColor('black'), 0)
})

test('resolveColor: named color "red" → 1', t => {
  t.is(resolveColor('red'), 1)
})

test('resolveColor: named color "green" → 2', t => {
  t.is(resolveColor('green'), 2)
})

test('resolveColor: named color "yellow" → 3', t => {
  t.is(resolveColor('yellow'), 3)
})

test('resolveColor: named color "blue" → 4', t => {
  t.is(resolveColor('blue'), 4)
})

test('resolveColor: named color "magenta" → 5', t => {
  t.is(resolveColor('magenta'), 5)
})

test('resolveColor: named color "cyan" → 6', t => {
  t.is(resolveColor('cyan'), 6)
})

test('resolveColor: named color "white" → 7', t => {
  t.is(resolveColor('white'), 7)
})

test('resolveColor: gray/grey aliases → 8', t => {
  t.is(resolveColor('gray'), 8)
  t.is(resolveColor('grey'), 8)
})

test('resolveColor: bright variants', t => {
  t.is(resolveColor('redBright'), 9)
  t.is(resolveColor('greenBright'), 10)
  t.is(resolveColor('whiteBright'), 15)
})

test('resolveColor: ansi256(N) string syntax', t => {
  t.is(resolveColor('ansi256(42)'), 42)
  t.is(resolveColor('ansi256(200)'), 200)
})

test('resolveColor: unknown string → 255 (terminal default)', t => {
  t.is(resolveColor('hotpink'), 255)
  t.is(resolveColor(''), 255)
})

// ─── Reconciler: Ink-compat props → buffer values ────────────────────────────

import React, { createElement } from 'react'
import { LayoutNode } from '../dist/layout.js'
import { RatatatReconciler } from '../dist/reconciler.js'
import { renderTreeToBuffer } from '../dist/renderer.js'
import { Cell } from '../dist/cell.js'

// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const COLS = 20, ROWS = 6

async function renderApp(element: React.ReactElement) {
  const root = new LayoutNode()
  const container = RatatatReconciler.createContainer(root, 0, null, false, null, '', () => {}, null)
  await React.act(async () => {
    RatatatReconciler.updateContainer(element, container, null, () => {})
  })
  root.calculateLayout(COLS, ROWS)
  const buffer = new Uint32Array(COLS * ROWS * 2)
  renderTreeToBuffer(root, buffer, COLS, ROWS)
  return buffer
}

function attrAt(buffer: Uint32Array, row: number, col: number) {
  return buffer[(row * COLS + col) * 2 + 1]
}

test('ink compat: color="green" → fg=2', async t => {
  const buf = await renderApp(
    createElement('text', { color: 'green' }, 'hi')
  )
  t.is(Cell.getFg(attrAt(buf, 0, 0)), 2)
})

test('ink compat: color="blue" → fg=4', async t => {
  const buf = await renderApp(
    createElement('text', { color: 'blue' }, 'hi')
  )
  t.is(Cell.getFg(attrAt(buf, 0, 0)), 4)
})

test('ink compat: backgroundColor="red" → bg=1', async t => {
  const buf = await renderApp(
    createElement('box', { backgroundColor: 'red', width: 5, height: 1 })
  )
  t.is(Cell.getBg(attrAt(buf, 0, 0)), 1)
})

test('ink compat: bold=true → styles bit 1 set', async t => {
  const buf = await renderApp(
    createElement('text', { bold: true }, 'hi')
  )
  t.is(Cell.getStyles(attrAt(buf, 0, 0)) & 1, 1)
})

test('ink compat: italic=true → styles bit 2 set (value 4)', async t => {
  const buf = await renderApp(
    createElement('text', { italic: true }, 'hi')
  )
  t.is(Cell.getStyles(attrAt(buf, 0, 0)) & 4, 4)
})

test('ink compat: dim=true → styles bit 1 set (value 2)', async t => {
  const buf = await renderApp(
    createElement('text', { dim: true }, 'hi')
  )
  t.is(Cell.getStyles(attrAt(buf, 0, 0)) & 2, 2)
})

test('ink compat: underline=true → styles bit 3 set (value 8)', async t => {
  const buf = await renderApp(
    createElement('text', { underline: true }, 'hi')
  )
  t.is(Cell.getStyles(attrAt(buf, 0, 0)) & 8, 8)
})

test('ink compat: bold+italic combined → styles has both bits', async t => {
  const buf = await renderApp(
    createElement('text', { bold: true, italic: true }, 'hi')
  )
  const styles = Cell.getStyles(attrAt(buf, 0, 0))
  t.is(styles & 1, 1, 'bold bit set')
  t.is(styles & 4, 4, 'italic bit set')
})

test('ink compat: color="white" + backgroundColor="blue" → fg=7 bg=4', async t => {
  const buf = await renderApp(
    createElement('text', { color: 'white', backgroundColor: 'blue' }, 'hi')
  )
  t.is(Cell.getFg(attrAt(buf, 0, 0)), 7)
  t.is(Cell.getBg(attrAt(buf, 0, 0)), 4)
})

test('ink compat: numeric fg/bg still works (ratatat native)', async t => {
  const buf = await renderApp(
    createElement('text', { fg: 3, bg: 9 }, 'hi')
  )
  t.is(Cell.getFg(attrAt(buf, 0, 0)), 3)
  t.is(Cell.getBg(attrAt(buf, 0, 0)), 9)
})

test('ink compat: numeric styles bitfield still works (ratatat native)', async t => {
  const buf = await renderApp(
    createElement('text', { styles: 3 }, 'hi') // bold+dim
  )
  t.is(Cell.getStyles(attrAt(buf, 0, 0)), 3)
})

test('ink compat: color prop survives re-render (commitUpdate)', async t => {
  const root = new LayoutNode()
  const container = RatatatReconciler.createContainer(root, 0, null, false, null, '', () => {}, null)

  // Initial render
  await React.act(async () => {
    RatatatReconciler.updateContainer(
      createElement('text', { color: 'green' }, 'hello'),
      container, null, () => {}
    )
  })

  // Re-render with different text (triggers commitTextUpdate + commitUpdate)
  await React.act(async () => {
    RatatatReconciler.updateContainer(
      createElement('text', { color: 'green' }, 'world'),
      container, null, () => {}
    )
  })

  root.calculateLayout(COLS, ROWS)
  const buffer = new Uint32Array(COLS * ROWS * 2)
  renderTreeToBuffer(root, buffer, COLS, ROWS)

  t.is(Cell.getFg(attrAt(buffer, 0, 0)), 2, 'fg=green(2) survives re-render')
})
