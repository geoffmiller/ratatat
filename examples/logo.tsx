/**
 * logo.tsx — Ratatat logo demo
 *
 * Renders the Ratatui logo glyphs with an animated color sweep across
 * the cells, demonstrating direct buffer painting alongside a React shell.
 *
 * The glyph shapes are the same hardcoded block-character strings used by
 * the official Ratatui logo widget. The animation (color cycling per column)
 * is painted directly into the Uint32Array back-buffer — React handles
 * the surrounding chrome, the logo pixels bypass React entirely.
 *
 * Run:
 *   node --import @oxc-node/core/register examples/logo.tsx          # loop forever
 *   node --import @oxc-node/core/register examples/logo.tsx --once   # one sweep then exit (for gif recording)
 */
// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { render, Box, Text, useApp, useInput, useWindowSize } from '../dist/index.js'

// ─── Args ─────────────────────────────────────────────────────────────────────

const ONCE = process.argv.includes('--once')

// ─── Logo strings (from ratatui/ratatui-widgets/src/logo.rs) ─────────────────

const LOGO_SMALL = ['█▀▀▄ ▄▀▀▄▝▜▛▘▄▀▀▄▝▜▛▘█  █ █', '█▀▀▄ █▀▀█ ▐▌ █▀▀█ ▐▌ ▀▄▄▀ █']

// Scale up: each char repeated SCALE times wide, each row SCALE times tall.
const SCALE = 4

function scaleLogo(lines: string[], scale: number): string[] {
  const scaled: string[] = []
  for (const line of lines) {
    const chars = [...line]
    const row = chars.map((c) => c.repeat(scale)).join('')
    for (let r = 0; r < scale; r++) scaled.push(row)
  }
  return scaled
}

const LOGO_LINES = scaleLogo(LOGO_SMALL, SCALE)
const LOGO_HEIGHT = LOGO_LINES.length // 2 * SCALE  = 8
const LOGO_WIDTH = [...LOGO_LINES[0]].length // 27 * SCALE = 108

// Precompute codepoints — zero string work in the hot paint path
const LOGO_CELLS: number[][] = LOGO_LINES.map((line) => [...line].map((c) => c.codePointAt(0)!))

// ─── Color palette — cyan → blue → magenta sweep ─────────────────────────────

const PALETTE = [51, 45, 39, 33, 27, 21, 57, 93, 129, 165, 201, 165, 129, 93, 57, 27]

// One full sweep = wave travels LOGO_WIDTH + PALETTE.length frames
// so every column completes a full cycle before we stop.
const ONE_LOOP_FRAMES = LOGO_WIDTH + PALETTE.length // 124 frames ≈ 5s at 40ms

// ─── Buffer painter ───────────────────────────────────────────────────────────

function paintLogo(buffer: Uint32Array, cols: number, rows: number, logoRow: number, logoCol: number, frame: number) {
  for (let y = 0; y < LOGO_HEIGHT; y++) {
    const termY = logoRow + y
    if (termY < 0 || termY >= rows) continue
    const cells = LOGO_CELLS[y]
    for (let x = 0; x < cells.length; x++) {
      const termX = logoCol + x
      if (termX < 0 || termX >= cols) continue
      const cp = cells[x]
      if (cp === 32) continue // spaces: let background show through
      const idx = (termY * cols + termX) * 2
      const paletteIdx = (x + frame) % PALETTE.length
      const fg = PALETTE[paletteIdx]
      buffer[idx] = cp
      buffer[idx + 1] = (0 << 16) | (255 << 8) | fg
    }
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

function LogoApp() {
  const { columns, rows } = useWindowSize()
  const { exit } = useApp()
  const [frame, setFrame] = useState(0)

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c') || key.escape || key.return) exit()
  })

  // 40ms per frame (~25fps) — smooth enough, slow enough for a readable gif
  useEffect(() => {
    let running = true
    function loop() {
      if (!running) return
      setFrame((f) => {
        const next = f + 1
        // In --once mode, exit after one full sweep
        if (ONCE && next >= ONE_LOOP_FRAMES) {
          setTimeout(exit, 40) // let the last frame paint before exit
          running = false
          return next
        }
        setTimeout(loop, 40)
        return next
      })
    }
    setTimeout(loop, 40)
    return () => {
      running = false
    }
  }, [exit])

  // Logo centered in terminal
  const logoRow = Math.max(0, Math.floor((rows - LOGO_HEIGHT - 6) / 2))
  const logoCol = Math.max(0, Math.floor((columns - LOGO_WIDTH) / 2))

  // Paint into buffer each frame
  useEffect(() => {
    const app = (globalThis as any).__ratatatApp
    if (!app) return
    const onRender = (buffer: Uint32Array, w: number, h: number) => {
      paintLogo(buffer, w, h, logoRow, logoCol, frame)
    }
    app.on('render', onRender)
    return () => app.off('render', onRender)
  })

  const subtitleRow = logoRow + LOGO_HEIGHT + 1

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box height={subtitleRow} flexShrink={0} />
      <Box justifyContent="center">
        <Text bold color="cyan">
          Ratatat
        </Text>
        <Text color="white"> — Ratatui + Ink. React for the terminal.</Text>
      </Box>
      <Box height={1} flexShrink={0} />
      <Box justifyContent="center">
        <Text dim>{ONCE ? 'recording one loop…' : 'q · enter · esc to exit'}</Text>
      </Box>
    </Box>
  )
}

const { app } = render(<LogoApp />)
;(globalThis as any).__ratatatApp = app
