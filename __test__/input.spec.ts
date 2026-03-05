import test from 'ava'
import EventEmitter from 'eventemitter3'
import { InputParser } from '../dist/input.js'

// Create a minimal mock stdin that satisfies InputParser's requirements
function createMockStdin() {
  const emitter = new EventEmitter()
  emitter.setRawMode = () => {}
  emitter.resume = () => {}
  emitter.pause = () => {}
  emitter.setEncoding = () => {}
  return emitter
}

function makeParser() {
  const stdin = createMockStdin()
  const parser = new InputParser(stdin)
  parser.start()
  return { stdin, parser }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

test('start() registers exactly one "data" listener on stdin', (t) => {
  const stdin = createMockStdin()
  const parser = new InputParser(stdin)
  parser.start()
  t.is(stdin.listenerCount('data'), 1)
  parser.stop()
})

test('stop() removes the "data" listener from stdin', (t) => {
  const stdin = createMockStdin()
  const parser = new InputParser(stdin)
  parser.start()
  parser.stop()
  t.is(stdin.listenerCount('data'), 0)
})

test('start() → stop() → start() results in exactly 1 listener', (t) => {
  const stdin = createMockStdin()
  const parser = new InputParser(stdin)
  parser.start()
  parser.stop()
  parser.start()
  t.is(stdin.listenerCount('data'), 1)
  parser.stop()
})

test('stop() before start() does not throw', (t) => {
  const stdin = createMockStdin()
  const parser = new InputParser(stdin)
  t.notThrows(() => parser.stop())
  t.is(stdin.listenerCount('data'), 0)
})

// ─── Exit ─────────────────────────────────────────────────────────────────────

test('Ctrl+C emits "exit"', (t) => {
  const { stdin, parser } = makeParser()
  let fired = false
  parser.on('exit', () => {
    fired = true
  })
  stdin.emit('data', '\u0003')
  t.true(fired)
  parser.stop()
})

test('Ctrl+C does not also emit "ctrl"', (t) => {
  const { stdin, parser } = makeParser()
  let ctrlFired = false
  parser.on('ctrl', () => {
    ctrlFired = true
  })
  stdin.emit('data', '\u0003')
  t.false(ctrlFired)
  parser.stop()
})

// ─── Arrow keys ───────────────────────────────────────────────────────────────

const arrowCases = [
  ['\u001b[A', 'up'],
  ['\u001b[B', 'down'],
  ['\u001b[C', 'right'],
  ['\u001b[D', 'left'],
] as const

for (const [seq, key] of arrowCases) {
  test(`arrow key: ${seq} → keydown "${key}"`, (t) => {
    const { stdin, parser } = makeParser()
    let got = ''
    parser.on('keydown', (k) => {
      got = k
    })
    stdin.emit('data', seq)
    t.is(got, key)
    parser.stop()
  })
}

// ─── Special keys ─────────────────────────────────────────────────────────────

const specialCases = [
  ['\t', 'tab'],
  ['\u001b[Z', 'shift-tab'],
  ['\u001b', 'escape'],
  ['\r', 'enter'],
  ['\n', 'enter'],
  ['\u007f', 'backspace'],
  ['\u001b[3~', 'delete'],
  ['\u001b[5~', 'pageUp'],
  ['\u001b[6~', 'pageDown'],
  ['\u001b[H', 'home'],
  ['\u001b[1~', 'home'],
  ['\u001b[F', 'end'],
  ['\u001b[4~', 'end'],
] as const

for (const [seq, key] of specialCases) {
  test(`special key: ${JSON.stringify(seq)} → keydown "${key}"`, (t) => {
    const { stdin, parser } = makeParser()
    let got = ''
    parser.on('keydown', (k) => {
      got = k
    })
    stdin.emit('data', seq)
    t.is(got, key)
    parser.stop()
  })
}

// ─── Ctrl combos ──────────────────────────────────────────────────────────────

test('Ctrl+A emits ctrl event with "a"', (t) => {
  const { stdin, parser } = makeParser()
  let got = ''
  parser.on('ctrl', (l) => {
    got = l
  })
  stdin.emit('data', '\u0001')
  t.is(got, 'a')
  parser.stop()
})

test('Ctrl+Z emits ctrl event with "z"', (t) => {
  const { stdin, parser } = makeParser()
  let got = ''
  parser.on('ctrl', (l) => {
    got = l
  })
  stdin.emit('data', '\u001a')
  t.is(got, 'z')
  parser.stop()
})

test('Ctrl combo also emits data with ctrl flag', (t) => {
  const { stdin, parser } = makeParser()
  let dataPayload: any = null
  parser.on('data', (d, flags) => {
    dataPayload = { d, flags }
  })
  stdin.emit('data', '\u0001')
  t.deepEqual(dataPayload?.flags, { ctrl: true })
  parser.stop()
})

// ─── Meta/Alt combos ─────────────────────────────────────────────────────────

test('Meta+a (\x1b + a) emits meta event with "a"', (t) => {
  const { stdin, parser } = makeParser()
  let got = ''
  parser.on('meta', (l) => {
    got = l
  })
  stdin.emit('data', '\u001ba')
  t.is(got, 'a')
  parser.stop()
})

test('Meta combo also emits data with meta flag', (t) => {
  const { stdin, parser } = makeParser()
  let dataPayload: any = null
  parser.on('data', (d, flags) => {
    dataPayload = { d, flags }
  })
  stdin.emit('data', '\u001ba')
  t.deepEqual(dataPayload?.flags, { meta: true })
  parser.stop()
})

// ─── Printable characters ────────────────────────────────────────────────────

test('printable character emits "data"', (t) => {
  const { stdin, parser } = makeParser()
  let received = ''
  parser.on('data', (d) => {
    received = d
  })
  stdin.emit('data', 'x')
  t.is(received, 'x')
  parser.stop()
})

test('printable character does not emit "keydown"', (t) => {
  const { stdin, parser } = makeParser()
  let keydownFired = false
  parser.on('keydown', () => {
    keydownFired = true
  })
  stdin.emit('data', 'x')
  t.false(keydownFired)
  parser.stop()
})

// ─── Mouse ───────────────────────────────────────────────────────────────────

test('SGR mouse click emits "click" with correct coords', (t) => {
  const { stdin, parser } = makeParser()
  let click: any = null
  parser.on('click', (c) => {
    click = c
  })
  stdin.emit('data', '\u001b[<0;5;10M')
  t.deepEqual(click, { x: 4, y: 9 }) // 1-indexed → 0-indexed
  parser.stop()
})

test('SGR mouse release does not emit "click"', (t) => {
  const { stdin, parser } = makeParser()
  let fired = false
  parser.on('click', () => {
    fired = true
  })
  stdin.emit('data', '\u001b[<0;5;10m') // lowercase m = release
  t.false(fired)
  parser.stop()
})
