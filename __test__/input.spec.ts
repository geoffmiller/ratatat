import test from 'ava'
import EventEmitter from 'eventemitter3'
import { InputParser } from '../dist/input.js'

// Create a minimal mock stdin that satisfies InputParser's requirements
function createMockStdin() {
  const emitter = new EventEmitter()
  // Stub out the methods InputParser calls
  emitter.setRawMode = () => {}
  emitter.resume = () => {}
  emitter.pause = () => {}
  emitter.setEncoding = () => {}
  return emitter
}

// T3: InputParser listener lifecycle

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

test('InputParser emits "exit" event on Ctrl+C', (t) => {
  const stdin = createMockStdin()
  const parser = new InputParser(stdin)
  parser.start()

  let exitFired = false
  parser.on('exit', () => { exitFired = true })
  stdin.emit('data', '\u0003')
  t.true(exitFired)

  parser.stop()
})

test('InputParser emits "keydown" with "up" for up-arrow escape', (t) => {
  const stdin = createMockStdin()
  const parser = new InputParser(stdin)
  parser.start()

  let key = ''
  parser.on('keydown', (k) => { key = k })
  stdin.emit('data', '\u001b[A')
  t.is(key, 'up')

  parser.stop()
})

test('InputParser emits "data" for printable character', (t) => {
  const stdin = createMockStdin()
  const parser = new InputParser(stdin)
  parser.start()

  let received = ''
  parser.on('data', (d) => { received = d })
  stdin.emit('data', 'x')
  t.is(received, 'x')

  parser.stop()
})
