import test from 'ava'
import EventEmitter from 'eventemitter3'
import { InputParser } from '../dist/input.js'

function createMockStdin() {
  const emitter = new EventEmitter() as any
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

// ─── Mouse events ─────────────────────────────────────────────────────────────

test('left click emits mouse event with button=left', (t) => {
  const { stdin, parser } = makeParser()
  let event: any = null
  parser.on('mouse', (e) => {
    event = e
  })
  stdin.emit('data', '\u001b[<0;5;10M')
  t.is(event?.button, 'left')
  t.is(event?.x, 4)
  t.is(event?.y, 9)
  parser.stop()
})

test('right click emits mouse event with button=right', (t) => {
  const { stdin, parser } = makeParser()
  let event: any = null
  parser.on('mouse', (e) => {
    event = e
  })
  stdin.emit('data', '\u001b[<2;1;1M')
  t.is(event?.button, 'right')
  parser.stop()
})

test('middle click emits mouse event with button=middle', (t) => {
  const { stdin, parser } = makeParser()
  let event: any = null
  parser.on('mouse', (e) => {
    event = e
  })
  stdin.emit('data', '\u001b[<1;1;1M')
  t.is(event?.button, 'middle')
  parser.stop()
})

test('scroll up emits mouse event with button=scrollUp', (t) => {
  const { stdin, parser } = makeParser()
  let event: any = null
  parser.on('mouse', (e) => {
    event = e
  })
  stdin.emit('data', '\u001b[<64;3;5M')
  t.is(event?.button, 'scrollUp')
  t.is(event?.x, 2)
  t.is(event?.y, 4)
  parser.stop()
})

test('scroll down emits mouse event with button=scrollDown', (t) => {
  const { stdin, parser } = makeParser()
  let event: any = null
  parser.on('mouse', (e) => {
    event = e
  })
  stdin.emit('data', '\u001b[<65;1;1M')
  t.is(event?.button, 'scrollDown')
  parser.stop()
})

test('mouse release does not emit mouse event', (t) => {
  const { stdin, parser } = makeParser()
  let fired = false
  parser.on('mouse', () => {
    fired = true
  })
  stdin.emit('data', '\u001b[<0;5;10m') // lowercase m = release
  t.false(fired)
  parser.stop()
})

test('mouse event with shift modifier', (t) => {
  const { stdin, parser } = makeParser()
  let event: any = null
  parser.on('mouse', (e) => {
    event = e
  })
  stdin.emit('data', '\u001b[<4;1;1M') // 4 = left(0) + shift(4)
  t.is(event?.button, 'left')
  t.true(event?.shift)
  t.false(event?.ctrl)
  parser.stop()
})

test('mouse event with ctrl modifier', (t) => {
  const { stdin, parser } = makeParser()
  let event: any = null
  parser.on('mouse', (e) => {
    event = e
  })
  stdin.emit('data', '\u001b[<16;1;1M') // 16 = left(0) + ctrl(16)
  t.is(event?.button, 'left')
  t.true(event?.ctrl)
  parser.stop()
})

test('left click still emits legacy click event', (t) => {
  const { stdin, parser } = makeParser()
  let click: any = null
  parser.on('click', (c) => {
    click = c
  })
  stdin.emit('data', '\u001b[<0;3;7M')
  t.deepEqual(click, { x: 2, y: 6 })
  parser.stop()
})

// ─── Bracketed paste ──────────────────────────────────────────────────────────

test('bracketed paste emits paste event with text', (t) => {
  const { stdin, parser } = makeParser()
  let pasted = ''
  parser.on('paste', (text) => {
    pasted = text
  })
  stdin.emit('data', '\u001b[200~hello world\u001b[201~')
  t.is(pasted, 'hello world')
  parser.stop()
})

test('bracketed paste strips opening and closing markers', (t) => {
  const { stdin, parser } = makeParser()
  let pasted = ''
  parser.on('paste', (text) => {
    pasted = text
  })
  stdin.emit('data', '\u001b[200~foo\u001b[201~')
  t.is(pasted, 'foo')
  parser.stop()
})

test('bracketed paste across multiple data events', (t) => {
  const { stdin, parser } = makeParser()
  let pasted = ''
  parser.on('paste', (text) => {
    pasted = text
  })
  stdin.emit('data', '\u001b[200~hel')
  stdin.emit('data', 'lo')
  stdin.emit('data', '\u001b[201~')
  t.is(pasted, 'hello')
  parser.stop()
})

test('bracketed paste does not emit keydown events', (t) => {
  const { stdin, parser } = makeParser()
  let keydownFired = false
  parser.on('keydown', () => {
    keydownFired = true
  })
  stdin.emit('data', '\u001b[200~test\u001b[201~')
  t.false(keydownFired)
  parser.stop()
})

test('bracketed paste falls back to data when no paste listeners are active', (t) => {
  const { stdin, parser } = makeParser()
  let dataPayload = ''
  parser.on('data', (value) => {
    dataPayload = value
  })
  stdin.emit('data', '\u001b[200~test\u001b[201~')
  t.is(dataPayload, 'test')
  parser.stop()
})

test('bracketed paste does not emit data when a paste listener is active', (t) => {
  const { stdin, parser } = makeParser()
  let dataFired = false
  let pasted = ''
  parser.on('data', () => {
    dataFired = true
  })
  parser.on('paste', (text) => {
    pasted = text
  })
  stdin.emit('data', '\u001b[200~test\u001b[201~')
  t.is(pasted, 'test')
  t.false(dataFired)
  parser.stop()
})

test('bracketed paste with multiline content', (t) => {
  const { stdin, parser } = makeParser()
  let pasted = ''
  parser.on('paste', (text) => {
    pasted = text
  })
  stdin.emit('data', '\u001b[200~line1\nline2\u001b[201~')
  t.is(pasted, 'line1\nline2')
  parser.stop()
})
