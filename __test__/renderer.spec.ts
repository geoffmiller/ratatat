import test from 'ava'
import { LayoutNode } from '../dist/layout.js'
import { applyStyles } from '../dist/styles.js'
import { renderTreeToBuffer } from '../dist/renderer.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLS = 80
const ROWS = 24

function makeBuffer() {
  return new Uint32Array(COLS * ROWS * 2)
}

function charAt(buffer: Uint32Array, col: number, row: number): string {
  const ch = buffer[(row * COLS + col) * 2]
  return String.fromCodePoint(ch)
}

function renderToString(buffer: Uint32Array): string {
  let out = ''
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = buffer[(row * COLS + col) * 2]
      out += ch === 32 ? '·' : String.fromCodePoint(ch)
    }
    out += '\n'
  }
  return out
}

// Build the chat layout tree (mirrors example-chat.tsx structure)
// Returns root node + mutable text nodes so we can simulate state changes
function buildChatTree(messageLines: string[], inputText: string) {
  const outer = new LayoutNode()
  outer.fg = 255
  outer.bg = 255
  outer._style = {
    flexDirection: 'column',
    padding: 1,
    width: COLS,
    height: ROWS,
    borderStyle: 'round',
    borderColor: 2,
  }
  applyStyles(outer.yogaNode, outer._style)

  const inner = new LayoutNode()
  inner.fg = 255
  inner.bg = 255
  inner._style = { flexDirection: 'column', height: 18, borderStyle: 'single', borderColor: 4, padding: 1 }
  applyStyles(inner.yogaNode, inner._style)

  // Message text nodes inside inner box
  for (const line of messageLines) {
    const msgBox = new LayoutNode()
    msgBox.fg = 255
    msgBox.bg = 255
    msgBox._style = { fg: 255, bg: 0 }
    applyStyles(msgBox.yogaNode, { flexDirection: 'row' })

    const msgText = new LayoutNode()
    msgText.fg = 255
    msgText.bg = 255
    msgText.text = line
    msgBox.insertChild(msgText, 0)
    inner.insertChild(msgBox, inner.children.length)
  }

  const bottom = new LayoutNode()
  bottom.fg = 255
  bottom.bg = 255
  bottom._style = { marginTop: 1 }
  applyStyles(bottom.yogaNode, bottom._style)

  const textBox = new LayoutNode()
  textBox.fg = 3
  textBox.bg = 255
  textBox._style = { fg: 3 }
  applyStyles(textBox.yogaNode, { flexDirection: 'row' })

  const textContent = new LayoutNode()
  textContent.fg = 255
  textContent.bg = 255
  textContent.text = `Enter your message: ${inputText}█`

  textBox.insertChild(textContent, 0)
  bottom.insertChild(textBox, 0)
  outer.insertChild(inner, 0)
  outer.insertChild(bottom, 1)

  return { outer, textContent }
}

function render(messageLines: string[], inputText: string) {
  const { outer } = buildChatTree(messageLines, inputText)
  outer.calculateLayout(COLS, ROWS)
  const buffer = makeBuffer()
  renderTreeToBuffer(outer, buffer, COLS, ROWS)
  return buffer
}

// ─── Border character sets ────────────────────────────────────────────────────

// cli-boxes 'round': ╭─╮╰─╯│
const ROUND = { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' }
// cli-boxes 'single': ┌─┐└─┘│
const SINGLE = { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' }

// ─── Outer border assertions ───────────────────────────────────────────────────

function assertOuterBorder(t: any, buffer: Uint32Array, label: string) {
  // Outer box: col 0..79, row 0..23
  t.is(charAt(buffer, 0, 0), ROUND.tl, `${label}: outer top-left`)
  t.is(charAt(buffer, COLS - 1, 0), ROUND.tr, `${label}: outer top-right`)
  t.is(charAt(buffer, 0, ROWS - 1), ROUND.bl, `${label}: outer bottom-left`)
  t.is(charAt(buffer, COLS - 1, ROWS - 1), ROUND.br, `${label}: outer bottom-right`)
  t.is(charAt(buffer, 1, 0), ROUND.h, `${label}: outer top edge`)
  t.is(charAt(buffer, 0, 1), ROUND.v, `${label}: outer left edge`)
  t.is(charAt(buffer, COLS - 1, 1), ROUND.v, `${label}: outer right edge`)
  t.is(charAt(buffer, 0, ROWS - 2), ROUND.v, `${label}: outer left edge bottom`)
  t.is(charAt(buffer, COLS - 1, ROWS - 2), ROUND.v, `${label}: outer right edge bottom`)
}

// Inner box: top=2, height=18 → bottom=19. left=2, width=76 → right=77.
function assertInnerBorder(t: any, buffer: Uint32Array, label: string) {
  t.is(charAt(buffer, 2, 2), SINGLE.tl, `${label}: inner top-left`)
  t.is(charAt(buffer, 77, 2), SINGLE.tr, `${label}: inner top-right`)
  t.is(charAt(buffer, 2, 19), SINGLE.bl, `${label}: inner bottom-left`)
  t.is(charAt(buffer, 77, 19), SINGLE.br, `${label}: inner bottom-right`)
  t.is(charAt(buffer, 3, 2), SINGLE.h, `${label}: inner top edge`)
  t.is(charAt(buffer, 2, 3), SINGLE.v, `${label}: inner left edge`)
  t.is(charAt(buffer, 77, 3), SINGLE.v, `${label}: inner right edge`)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test('renderer: outer border present on initial render (empty state)', (t) => {
  const buf = render([], '')
  assertOuterBorder(t, buf, 'initial')
})

test('renderer: inner border present on initial render (empty state)', (t) => {
  const buf = render([], '')
  assertInnerBorder(t, buf, 'initial')
})

test('renderer: both borders present after one message', (t) => {
  const buf = render(['User: hello'], '')
  assertOuterBorder(t, buf, 'one message')
  assertInnerBorder(t, buf, 'one message')
})

test('renderer: both borders present after multiple messages', (t) => {
  const buf = render(['User: this is a message', 'User: and another'], '')
  assertOuterBorder(t, buf, 'two messages')
  assertInnerBorder(t, buf, 'two messages')
})

test('renderer: both borders present while input is being typed', (t) => {
  const buf = render([], 'hello')
  assertOuterBorder(t, buf, 'typing')
  assertInnerBorder(t, buf, 'typing')
})

test('renderer: both borders present with messages AND typed input', (t) => {
  const buf = render(['User: this is a message', 'User: and another'], 'hello')
  assertOuterBorder(t, buf, 'messages + typing')
  assertInnerBorder(t, buf, 'messages + typing')
})

test('renderer: input text visible at row 21', (t) => {
  const buf = render([], '')
  // bottom box at row 21 (outer: border=1,pad=1 + inner h=18 + marginTop=1 = 21)
  // text starts at col 2 (outer border=1 + outer padding=1)
  const line = Array.from({ length: 21 }, (_, i) => charAt(buf, 2 + i, 21)).join('')
  t.is(line, 'Enter your message: █', 'input prompt visible at row 21')
})

test('renderer: message text visible inside inner box', (t) => {
  const buf = render(['User: hello'], '')
  // inner: top=2, border=1, padding=1 → content row=4
  // inner: left=2, border=1, padding=1 → content col=4
  const line = Array.from({ length: 11 }, (_, i) => charAt(buf, 4 + i, 4)).join('')
  t.is(line, 'User: hello', 'message text visible at expected position')
})

test('renderer: outer bottom border NOT overwritten after messages + input', (t) => {
  // This is the specific regression: bottom border row (23) must stay intact
  const buf = render(['User: this is a message', 'User: and another'], 'typing something')
  // Entire bottom border row should be border characters, not spaces
  t.is(charAt(buf, 0, ROWS - 1), ROUND.bl, 'outer bottom-left corner')
  t.is(charAt(buf, COLS - 1, ROWS - 1), ROUND.br, 'outer bottom-right corner')
  for (let col = 1; col < COLS - 1; col++) {
    const ch = charAt(buf, col, ROWS - 1)
    t.is(ch, ROUND.h, `outer bottom edge col ${col}`)
  }
})

// ─── Yoga node lifecycle ──────────────────────────────────────────────────────

test('LayoutNode.destroy() frees yogaNode and sets _destroyed guard', (t) => {
  const node = new LayoutNode()
  // @ts-ignore — accessing private
  t.false(node._destroyed, 'not destroyed initially')
  node.destroy()
  // @ts-ignore
  t.true(node._destroyed, 'destroyed after destroy()')
  // double-destroy should not throw
  t.notThrows(() => node.destroy(), 'double destroy is safe')
})

test.serial('detachDeletedInstance frees Yoga nodes when React removes children', async (t) => {
  const React = (await import('react')).default
  const { act } = await import('react')
  const { create: createTestRenderer } = await import('react-test-renderer')
  const { RatatatReconciler } = await import('../dist/reconciler.js')

  // @ts-ignore
  globalThis.IS_REACT_ACT_ENVIRONMENT = true

  let destroyCalls = 0
  const origDestroy = LayoutNode.prototype.destroy
  LayoutNode.prototype.destroy = function () {
    destroyCalls++
    return origDestroy.call(this)
  }

  const root = new LayoutNode()
  const container = RatatatReconciler.createContainer(root, 0, null, false, null, '', () => {}, null)

  // Mount 4 children
  await act(async () => {
    RatatatReconciler.updateContainer(
      React.createElement(
        'box',
        null,
        React.createElement('text', null, 'A'),
        React.createElement('text', null, 'B'),
        React.createElement('text', null, 'C'),
        React.createElement('text', null, 'D'),
      ),
      container,
      null,
      () => {},
    )
  })

  t.is(destroyCalls, 0, 'no destroys on initial mount')
  t.is(root.children[0]?.children.length, 4, '4 children mounted')

  // Shrink to 1 — removes 3 nodes
  await act(async () => {
    RatatatReconciler.updateContainer(
      React.createElement('box', null, React.createElement('text', null, 'A')),
      container,
      null,
      () => {},
    )
  })

  t.is(destroyCalls, 3, 'destroy called for each removed node')
  t.is(root.children[0]?.children.length, 1, '1 child remains')

  // Restore
  LayoutNode.prototype.destroy = origDestroy
})

// ─── Transform tests ──────────────────────────────────────────────────────────

test('Transform: uppercase transform is applied to child text', (t) => {
  const root = new LayoutNode()
  root.yogaNode.setWidth(COLS)
  root.yogaNode.setHeight(ROWS)

  // Box node with transform
  const transformNode = new LayoutNode()
  transformNode.transform = (s: string) => s.toUpperCase()
  applyStyles(transformNode.yogaNode, { flexShrink: 1 })

  // Text child
  const textNode = new LayoutNode()
  textNode.text = 'hello'

  transformNode.yogaNode.insertChild(textNode.yogaNode, 0)
  transformNode.children.push(textNode)
  textNode.parent = transformNode

  root.yogaNode.insertChild(transformNode.yogaNode, 0)
  root.children.push(transformNode)
  transformNode.parent = root

  const buf = makeBuffer()
  renderTreeToBuffer(root, buf, COLS, ROWS)

  t.is(charAt(buf, 0, 0), 'H')
  t.is(charAt(buf, 1, 0), 'E')
  t.is(charAt(buf, 2, 0), 'L')
  t.is(charAt(buf, 3, 0), 'L')
  t.is(charAt(buf, 4, 0), 'O')
})

test('Transform: reverse transform works across multiple text children', (t) => {
  const root = new LayoutNode()
  root.yogaNode.setWidth(COLS)
  root.yogaNode.setHeight(ROWS)

  const transformNode = new LayoutNode()
  transformNode.transform = (s: string) => s.split('').reverse().join('')
  applyStyles(transformNode.yogaNode, { flexShrink: 1 })

  const textNode = new LayoutNode()
  textNode.text = 'abc'

  transformNode.yogaNode.insertChild(textNode.yogaNode, 0)
  transformNode.children.push(textNode)
  textNode.parent = transformNode

  root.yogaNode.insertChild(transformNode.yogaNode, 0)
  root.children.push(transformNode)
  transformNode.parent = root

  const buf = makeBuffer()
  renderTreeToBuffer(root, buf, COLS, ROWS)

  t.is(charAt(buf, 0, 0), 'c')
  t.is(charAt(buf, 1, 0), 'b')
  t.is(charAt(buf, 2, 0), 'a')
})

test('Transform: transform receives index 0', (t) => {
  const root = new LayoutNode()
  root.yogaNode.setWidth(COLS)
  root.yogaNode.setHeight(ROWS)

  const transformNode = new LayoutNode()
  let capturedIndex = -1
  transformNode.transform = (s: string, index: number) => {
    capturedIndex = index
    return s
  }
  applyStyles(transformNode.yogaNode, { flexShrink: 1 })

  const textNode = new LayoutNode()
  textNode.text = 'x'

  transformNode.yogaNode.insertChild(textNode.yogaNode, 0)
  transformNode.children.push(textNode)
  textNode.parent = transformNode
  root.yogaNode.insertChild(transformNode.yogaNode, 0)
  root.children.push(transformNode)
  transformNode.parent = root

  const buf = makeBuffer()
  renderTreeToBuffer(root, buf, COLS, ROWS)

  t.is(capturedIndex, 0)
})

// ─── Unicode / multi-byte ─────────────────────────────────────────────────────

test('renderer: emoji (surrogate pair) renders as single cell', (t) => {
  const root = new LayoutNode()
  root.yogaNode.setWidth(COLS)
  root.yogaNode.setHeight(ROWS)

  const textNode = new LayoutNode()
  textNode.text = '🐭' // U+1F42D, requires surrogate pair in JS string

  root.yogaNode.insertChild(textNode.yogaNode, 0)
  root.children.push(textNode)
  textNode.parent = root

  const buf = makeBuffer()
  renderTreeToBuffer(root, buf, COLS, ROWS)

  // Cell 0 should be the rat emoji codepoint
  t.is(buf[0], '🐭'.codePointAt(0))
  // Cell 1 should be a space (not the low surrogate)
  t.is(buf[2], 32)
})

test('renderer: mixed ASCII and emoji string renders correctly', (t) => {
  const root = new LayoutNode()
  root.yogaNode.setWidth(COLS)
  root.yogaNode.setHeight(ROWS)

  const textNode = new LayoutNode()
  textNode.text = 'A🐭B'

  root.yogaNode.insertChild(textNode.yogaNode, 0)
  root.children.push(textNode)
  textNode.parent = root

  const buf = makeBuffer()
  renderTreeToBuffer(root, buf, COLS, ROWS)

  t.is(charAt(buf, 0, 0), 'A')
  t.is(buf[2], '🐭'.codePointAt(0)) // cell 1 = emoji codepoint
  t.is(charAt(buf, 2, 0), 'B') // cell 2 = 'B' (not a surrogate)
})
