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
 * Run: node --import @oxc-node/core/register examples/logo.tsx
 */
// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react'
import { render, Box, Text, useApp, useInput, useWindowSize } from '../dist/index.js'

// ─── Logo strings (from ratatui/ratatui-widgets/src/logo.rs) ─────────────────

const LOGO_TINY = ['▛▚▗▀▖▜▘▞▚▝▛▐ ▌▌', '▛▚▐▀▌▐ ▛▜ ▌▝▄▘▌']

const LOGO_SMALL = ['█▀▀▄ ▄▀▀▄▝▜▛▘▄▀▀▄▝▜▛▘█  █ █', '█▀▀▄ █▀▀█ ▐▌ █▀▀█ ▐▌ ▀▄▄▀ █']

// Scale up by repeating each char N times horizontally and each row N times
// vertically. scale=4 gives a logo that's readable at normal terminal sizes.
const SCALE = 4

function scaleLogo(lines: string[], scale: number): string[] {
  const scaled: string[] = []
  for (const line of lines) {
    // Spread to handle multi-byte Unicode correctly
    const chars = [...line]
    const row = chars.map((c) => c.repeat(scale)).join('')
    for (let r = 0; r < scale; r++) scaled.push(row)
  }
  return scaled
}

const LOGO_LINES = scaleLogo(LOGO_SMALL, SCALE)
const LOGO_HEIGHT = LOGO_LINES.length // 2 * SCALE = 8 rows
const LOGO_WIDTH = [...LOGO_LINES[0]].length // 27 * SCALE = 108 cols

// Precompute codepoints for each cell so the paint loop does zero string work
const LOGO_CELLS: number[][] = LOGO_LINES.map((line) => [...line].map((c) => c.codePointAt(0)!))

// ─── Color palette — cyan → blue → magenta sweep ─────────────────────────────

// ANSI 256-color ramp: cyan family columns
const PALETTE = [51, 45, 39, 33, 27, 21, 57, 93, 129, 165, 201, 165, 129, 93, 57, 27]

// ─── Buffer painter ───────────────────────────────────────────────────────────

function paintLogo(
  buffer: Uint32Array,
  cols: number,
  rows: number,
  logoRow: number, // top row in terminal where logo starts
  logoCol: number, // left col in terminal where logo starts
  frame: number,
) {
  for (let y = 0; y < LOGO_HEIGHT; y++) {
    const termY = logoRow + y
    if (termY < 0 || termY >= rows) continue
    const cells = LOGO_CELLS[y]
    for (let x = 0; x < cells.length; x++) {
      const termX = logoCol + x
      if (termX < 0 || termX >= cols) continue
      const cp = cells[x]
      if (cp === 32) continue // skip spaces — let background show through
      const idx = (termY * cols + termX) * 2
      // Color sweeps left-to-right, animated by frame
      const paletteIdx = (x + frame) % PALETTE.length
      const fg = PALETTE[paletteIdx]
      // attr: (styles<<16) | (bg<<8) | fg
      // fg > 15: encode as 256-color. Ratatat uses 0-255 for fg/bg.
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

  // Animation — ~30fps is plenty for a color sweep
  useEffect(() => {
    let running = true
    function loop() {
      if (!running) return
      setFrame((f) => f + 1)
      setTimeout(loop, 33)
    }
    loop()
    return () => {
      running = false
    }
  }, [])

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
  const hintRow = subtitleRow + 2

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      {/* Spacer to push subtitle below logo */}
      <Box height={subtitleRow} flexShrink={0} />
      <Box justifyContent="center">
        <Text bold color="cyan">
          Ratatat
        </Text>
        <Text color="white"> — Ratatui + Ink. React for the terminal.</Text>
      </Box>
      <Box height={1} flexShrink={0} />
      <Box justifyContent="center">
        <Text dim>q · enter · esc to exit</Text>
      </Box>
    </Box>
  )
}

const { app } = render(<LogoApp />)
;(globalThis as any).__ratatatApp = app
