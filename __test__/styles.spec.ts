import test from 'ava'
import Yoga from 'yoga-layout-prebuilt'
import { applyStyles } from '../dist/styles.js'

// ─── T7: justifyContent 'space-evenly' maps to Yoga.JUSTIFY_SPACE_EVENLY ─────

test('applyStyles justifyContent: space-evenly calls setJustifyContent with JUSTIFY_SPACE_EVENLY', (t) => {
  const node = Yoga.Node.create()
  applyStyles(node, { justifyContent: 'space-evenly' })
  // Yoga.Node.getJustifyContent() returns the current value set on the node
  t.is(node.getJustifyContent(), Yoga.JUSTIFY_SPACE_EVENLY)
  node.free()
})

test('applyStyles justifyContent: flex-start maps correctly', (t) => {
  const node = Yoga.Node.create()
  applyStyles(node, { justifyContent: 'flex-start' })
  t.is(node.getJustifyContent(), Yoga.JUSTIFY_FLEX_START)
  node.free()
})

test('applyStyles justifyContent: center maps correctly', (t) => {
  const node = Yoga.Node.create()
  applyStyles(node, { justifyContent: 'center' })
  t.is(node.getJustifyContent(), Yoga.JUSTIFY_CENTER)
  node.free()
})

test('applyStyles justifyContent: flex-end maps correctly', (t) => {
  const node = Yoga.Node.create()
  applyStyles(node, { justifyContent: 'flex-end' })
  t.is(node.getJustifyContent(), Yoga.JUSTIFY_FLEX_END)
  node.free()
})

test('applyStyles justifyContent: space-between maps correctly', (t) => {
  const node = Yoga.Node.create()
  applyStyles(node, { justifyContent: 'space-between' })
  t.is(node.getJustifyContent(), Yoga.JUSTIFY_SPACE_BETWEEN)
  node.free()
})

test('applyStyles justifyContent: space-around maps correctly', (t) => {
  const node = Yoga.Node.create()
  applyStyles(node, { justifyContent: 'space-around' })
  t.is(node.getJustifyContent(), Yoga.JUSTIFY_SPACE_AROUND)
  node.free()
})

// ─── B6: alignContent map is complete for supported values ───────────────────

test('applyStyles alignContent: flex-start maps correctly', (t) => {
  const node = Yoga.Node.create()
  applyStyles(node, { alignContent: 'flex-start' })
  t.is(node.getAlignContent(), Yoga.ALIGN_FLEX_START)
  node.free()
})

test('applyStyles alignContent: center maps correctly', (t) => {
  const node = Yoga.Node.create()
  applyStyles(node, { alignContent: 'center' })
  t.is(node.getAlignContent(), Yoga.ALIGN_CENTER)
  node.free()
})

test('applyStyles alignContent: stretch maps correctly', (t) => {
  const node = Yoga.Node.create()
  applyStyles(node, { alignContent: 'stretch' })
  t.is(node.getAlignContent(), Yoga.ALIGN_STRETCH)
  node.free()
})

test('applyStyles alignContent: space-between maps correctly', (t) => {
  const node = Yoga.Node.create()
  applyStyles(node, { alignContent: 'space-between' })
  t.is(node.getAlignContent(), Yoga.ALIGN_SPACE_BETWEEN)
  node.free()
})

test('applyStyles alignContent: space-around maps correctly', (t) => {
  const node = Yoga.Node.create()
  applyStyles(node, { alignContent: 'space-around' })
  t.is(node.getAlignContent(), Yoga.ALIGN_SPACE_AROUND)
  node.free()
})
