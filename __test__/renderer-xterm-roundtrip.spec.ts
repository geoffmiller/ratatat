import test from 'ava'
import XtermHeadless from '@xterm/headless'
import stringWidth from 'string-width'
import { Renderer } from '../index.js'

const { Terminal } = XtermHeadless as any

const DEFAULT_ATTR = (0 << 16) | (255 << 8) | 255
const CONTINUATION_CELL_CODE = 0x110000

type HeadlessTerminal = any

function createBackBuffer(cols: number, rows: number): Uint32Array {
  const buffer = new Uint32Array(cols * rows * 2)
  for (let i = 0; i < buffer.length; i += 2) {
    buffer[i] = 32
    buffer[i + 1] = DEFAULT_ATTR
  }
  return buffer
}

function setCell(buffer: Uint32Array, cols: number, col: number, row: number, charCode: number, attr = DEFAULT_ATTR) {
  const idx = (row * cols + col) * 2
  buffer[idx] = charCode
  buffer[idx + 1] = attr
}

function writeText(
  buffer: Uint32Array,
  cols: number,
  row: number,
  startCol: number,
  text: string,
  attr = DEFAULT_ATTR,
) {
  let col = startCol
  for (const char of text) {
    if (char === '\n') break
    if (col >= cols) break

    const width = Math.max(1, stringWidth(char))
    const clampedWidth = Math.min(width, 2)
    const charCode = char.codePointAt(0) ?? 32

    setCell(buffer, cols, col, row, charCode, attr)

    // Continuation marker for wide chars
    if (clampedWidth === 2 && col + 1 < cols) {
      setCell(buffer, cols, col + 1, row, CONTINUATION_CELL_CODE, attr)
    }

    col += clampedWidth
  }
}

function cloneBuffer(buffer: Uint32Array): Uint32Array {
  return new Uint32Array(buffer)
}

function createTerminal(cols: number, rows: number): HeadlessTerminal {
  return new Terminal({ cols, rows, allowProposedApi: true, convertEol: true })
}

async function writeAnsi(term: HeadlessTerminal, ansi: string): Promise<void> {
  await new Promise<void>((resolve) => {
    term.write(ansi, resolve)
  })
}

function readTerminalCell(term: HeadlessTerminal, row: number, col: number): { char: string; width: number } {
  const line = term.buffer.active.getLine(row)
  const xtermCell = line?.getCell(col)

  if (!xtermCell) return { char: ' ', width: 1 }

  const width = xtermCell.getWidth()
  if (width === 0) {
    return { char: '', width: 0 }
  }

  return {
    char: xtermCell.getChars() || ' ',
    width,
  }
}

function expectedCellFromBuffer(
  buffer: Uint32Array,
  cols: number,
  row: number,
  col: number,
): { char: string; width: number } {
  const idx = (row * cols + col) * 2
  const charCode = buffer[idx]

  if (charCode === CONTINUATION_CELL_CODE) {
    return { char: '', width: 0 }
  }

  const char = String.fromCodePoint(charCode)
  return {
    char,
    width: Math.max(1, stringWidth(char)),
  }
}

function assertTerminalMatchesBuffer(
  t: any,
  term: HeadlessTerminal,
  buffer: Uint32Array,
  cols: number,
  rows: number,
  label: string,
) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const actual = readTerminalCell(term, row, col)
      const expected = expectedCellFromBuffer(buffer, cols, row, col)

      if (actual.char !== expected.char || actual.width !== expected.width) {
        t.fail(
          `${label}: mismatch at row=${row}, col=${col}\n` +
            `  actual:   ${JSON.stringify(actual)}\n` +
            `  expected: ${JSON.stringify(expected)}`,
        )
        return
      }
    }
  }

  t.pass()
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

test('xterm replay: incremental ASCII diff round-trip', async (t) => {
  const cols = 20
  const rows = 6

  const renderer = new Renderer(cols, rows)
  const term = createTerminal(cols, rows)

  const frameA = createBackBuffer(cols, rows)
  writeText(frameA, cols, 1, 2, 'hello world')
  writeText(frameA, cols, 3, 1, 'status: ready')

  const ansiA = renderer.renderDiff(frameA)
  await writeAnsi(term, ansiA)

  const frameB = cloneBuffer(frameA)
  writeText(frameB, cols, 1, 2, 'hello ratatat')
  writeText(frameB, cols, 3, 1, 'status: updated')

  const ansiB = renderer.renderDiff(frameB)
  await writeAnsi(term, ansiB)

  assertTerminalMatchesBuffer(t, term, frameB, cols, rows, 'ascii round-trip')
  term.dispose()
})

test('xterm replay: wide CJK characters preserve continuation cells', async (t) => {
  const cols = 12
  const rows = 4

  const renderer = new Renderer(cols, rows)
  const term = createTerminal(cols, rows)

  const frameA = createBackBuffer(cols, rows)
  writeText(frameA, cols, 0, 0, '界A')
  writeText(frameA, cols, 1, 0, '你好')

  const ansiA = renderer.renderDiff(frameA)
  await writeAnsi(term, ansiA)

  assertTerminalMatchesBuffer(t, term, frameA, cols, rows, 'cjk frame')

  const frameB = createBackBuffer(cols, rows)
  writeText(frameB, cols, 0, 0, '界B')
  writeText(frameB, cols, 1, 0, '你界')

  const ansiB = renderer.renderDiff(frameB)
  await writeAnsi(term, ansiB)

  assertTerminalMatchesBuffer(t, term, frameB, cols, rows, 'cjk diff frame')
  term.dispose()
})

test('xterm replay: deterministic randomized ASCII smoke', async (t) => {
  const cols = 24
  const rows = 8
  const rng = mulberry32(0xdecafbad)

  const renderer = new Renderer(cols, rows)
  const term = createTerminal(cols, rows)

  let frame = createBackBuffer(cols, rows)

  for (let step = 0; step < 25; step++) {
    const next = cloneBuffer(frame)
    const mutations = 1 + Math.floor(rng() * 10)

    for (let i = 0; i < mutations; i++) {
      const row = Math.floor(rng() * rows)
      const col = Math.floor(rng() * cols)
      const isSpace = rng() < 0.2
      const charCode = isSpace ? 32 : 65 + Math.floor(rng() * 26)
      setCell(next, cols, col, row, charCode, DEFAULT_ATTR)
    }

    const ansi = renderer.renderDiff(next)
    await writeAnsi(term, ansi)

    assertTerminalMatchesBuffer(t, term, next, cols, rows, `random step ${step}`)
    frame = next
  }

  term.dispose()
})
