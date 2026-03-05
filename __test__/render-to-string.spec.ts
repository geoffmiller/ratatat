import test from 'ava'
import React, { useState, useLayoutEffect } from 'react'
import { renderToString } from '../dist/render-to-string.js'
import { Transform } from '../dist/react.js'

// ─── Basic rendering ──────────────────────────────────────────────────────────

test('renderToString: renders plain text', t => {
  const out = renderToString(
    React.createElement('text', {}, 'Hello World')
  )
  t.is(out, 'Hello World')
})

test('renderToString: returns empty string for null children', t => {
  const out = renderToString(React.createElement('box', {}))
  t.is(out, '')
})

test('renderToString: respects columns option', t => {
  const out = renderToString(
    React.createElement('text', {}, 'Hello World'),
    { columns: 40 }
  )
  t.true(out.length <= 40)
  t.true(out.includes('Hello'))
})

test('renderToString: multiple lines trimmed correctly', t => {
  const out = renderToString(
    React.createElement('box', { flexDirection: 'column' },
      React.createElement('text', {}, 'line one'),
      React.createElement('text', {}, 'line two'),
    )
  )
  const lines = out.split('\n')
  t.true(lines.some(l => l.includes('line one')))
  t.true(lines.some(l => l.includes('line two')))
})

test('renderToString: trailing empty lines stripped', t => {
  const out = renderToString(
    React.createElement('text', {}, 'hi'),
    { columns: 80, rows: 24 }
  )
  // Should not end with a newline or have many blank lines
  t.false(out.endsWith('\n'))
  t.true(out.includes('hi'))
})

test('renderToString: Box padding reflected in output', t => {
  const out = renderToString(
    React.createElement('box', { padding: 1 },
      React.createElement('text', {}, 'padded')
    )
  )
  const lines = out.split('\n')
  // First line should be blank (top padding)
  t.is(lines[0].trim(), '')
  // Second line should start with a space (left padding)
  t.true(lines[1].startsWith(' '))
  t.true(lines[1].includes('padded'))
})

// ─── Component support ────────────────────────────────────────────────────────

test('renderToString: function components work', t => {
  function Greeting({ name }: { name: string }) {
    return React.createElement('text', {}, `Hello, ${name}!`)
  }
  const out = renderToString(React.createElement(Greeting, { name: 'World' }))
  t.true(out.includes('Hello, World!'))
})

test('renderToString: useLayoutEffect state updates are reflected', t => {
  function App() {
    const [label, setLabel] = useState('before')
    useLayoutEffect(() => { setLabel('after') }, [])
    return React.createElement('text', {}, label)
  }
  const out = renderToString(React.createElement(App))
  t.true(out.includes('after'))
})

test('renderToString: can be called multiple times independently', t => {
  const a = renderToString(React.createElement('text', {}, 'first'))
  const b = renderToString(React.createElement('text', {}, 'second'))
  t.true(a.includes('first'))
  t.true(b.includes('second'))
  t.false(a.includes('second'))
})

// ─── Transform support ────────────────────────────────────────────────────────

test('renderToString: Transform component works', t => {
  const out = renderToString(
    React.createElement(Transform, { transform: (s: string) => s.toUpperCase() },
      React.createElement('text', {}, 'hello')
    )
  )
  t.true(out.includes('HELLO'))
})
