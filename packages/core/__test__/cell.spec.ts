import test from 'ava'
import { Cell } from '../dist/cell.js'

// T1: Cell.pack() returns a [charCode, attrCode] tuple

test('Cell.pack returns an array of length 2', (t) => {
  const result = Cell.pack('A', 1, 2, 3)
  t.is(result.length, 2)
})

test('Cell.pack tuple[0] equals charCodeAt(0) for "A"', (t) => {
  const [charCode] = Cell.pack('A', 1, 2, 3)
  t.is(charCode, 65) // 'A'.charCodeAt(0)
})

test('Cell.pack tuple[1] encodes fg in bits 7:0, bg in bits 15:8, styles in bits 23:16', (t) => {
  const [, attrCode] = Cell.pack('A', 1, 2, 3)
  t.is(attrCode, (3 << 16) | (2 << 8) | 1)
})

test('Cell.pack defaults: space char with fg=255, bg=255, styles=0', (t) => {
  const [charCode, attrCode] = Cell.pack(' ')
  t.is(charCode, 32) // ' '.charCodeAt(0)
  t.is(attrCode, (0 << 16) | (255 << 8) | 255) // 0x00FFFF
})

test('Cell.getChar(65) returns "A"', (t) => {
  t.is(Cell.getChar(65), 'A')
})

test('Cell.getChar(32) returns space', (t) => {
  t.is(Cell.getChar(32), ' ')
})

test('Cell.getFg reads bits 7:0 from attr slot', (t) => {
  // 0x030201: styles=3, bg=2, fg=1
  t.is(Cell.getFg(0x030201), 1)
})

test('Cell.getBg reads bits 15:8 from attr slot', (t) => {
  t.is(Cell.getBg(0x030201), 2)
})

test('Cell.getStyles reads bits 23:16 from attr slot', (t) => {
  t.is(Cell.getStyles(0x030201), 3)
})

test('Cell.getFg/getBg/getStyles round-trip correctly from pack result', (t) => {
  const [, attrCode] = Cell.pack('Z', 42, 100, 7)
  t.is(Cell.getFg(attrCode), 42)
  t.is(Cell.getBg(attrCode), 100)
  t.is(Cell.getStyles(attrCode), 7)
})

test('Cell.getChar from pack result round-trips correctly', (t) => {
  const [charCode] = Cell.pack('Z', 42, 100, 7)
  t.is(Cell.getChar(charCode), 'Z')
})
