import test from 'ava'
import React, { act, createElement } from 'react'
import { create as createTestRenderer } from 'react-test-renderer'
import { renderToString } from '../dist/render-to-string.js'
import { ProgressBar, Spinner } from '../dist/react.js'

// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const serialTest = test.serial

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

test('ProgressBar: renders default bar with percentage', (t) => {
  const out = renderToString(createElement(ProgressBar, { value: 50, width: 10 }))
  t.is(out, '[█████░░░░░] 50%')
})

test('ProgressBar: clamps value to [0, max]', (t) => {
  const below = renderToString(createElement(ProgressBar, { value: -10, width: 10 }))
  const above = renderToString(createElement(ProgressBar, { value: 150, width: 10 }))

  t.is(below, '[░░░░░░░░░░] 0%')
  t.is(above, '[██████████] 100%')
})

test('ProgressBar: supports custom max, chars, and options', (t) => {
  const out = renderToString(
    createElement(ProgressBar, {
      value: 3,
      max: 4,
      width: 8,
      completeChar: '=',
      incompleteChar: '-',
      bracket: false,
      showPercentage: false,
    }),
  )
  t.is(out, '======--')
})

serialTest('Spinner: renders first frame initially', async (t) => {
  let rendered: any
  await act(async () => {
    rendered = createTestRenderer(createElement(Spinner, { frames: ['a', 'b', 'c'], interval: 50 }))
  })

  const json = rendered.toJSON()
  t.is(json?.type, 'text')
  t.deepEqual(json?.children, ['a'])

  await act(async () => {
    rendered.unmount()
  })
})

serialTest('Spinner: advances frame over time', async (t) => {
  let rendered: any
  await act(async () => {
    rendered = createTestRenderer(createElement(Spinner, { frames: ['a', 'b', 'c'], interval: 50 }))
  })

  await act(async () => {
    await sleep(130)
  })

  const frame = rendered.toJSON()?.children?.[0]
  t.true(frame === 'b' || frame === 'c', `expected spinner frame to advance, got ${String(frame)}`)

  await act(async () => {
    rendered.unmount()
  })
})
