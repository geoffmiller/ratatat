/**
 * stress-test.tsx — ratatat stress test
 *
 * Renders a full-terminal grid of cells that updates as fast as React
 * will let it. Shows achieved FPS, total frames rendered, and a live
 * color-cycling matrix to visually confirm no dropped frames or tearing.
 *
 * Run: node --import @oxc-node/core/register examples/stress-test.tsx
 */
// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { render, Box, Text, useWindowSize, useApp } from '../dist/index.js'

// ─── FPS counter ─────────────────────────────────────────────────────────────

function useFps() {
  const [fps, setFps] = useState(0)
  const frames = useRef(0)
  const last = useRef(Date.now())

  const tick = useCallback(() => {
    frames.current++
    const now = Date.now()
    const elapsed = now - last.current
    if (elapsed >= 500) {
      setFps(Math.round((frames.current / elapsed) * 1000))
      frames.current = 0
      last.current = now
    }
  }, [])

  return { fps, tick }
}

// ─── Color cycling helpers ────────────────────────────────────────────────────

const NAMED_COLORS = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']

function cellColor(x: number, y: number, frame: number): string {
  return NAMED_COLORS[(x + y + frame) % NAMED_COLORS.length]
}

function cellChar(x: number, y: number, frame: number): string {
  const chars = '█▓▒░▪▫●○◆◇'
  return chars[(x * 3 + y * 7 + frame) % chars.length]
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

function Grid({ cols, rows, frame }: { cols: number; rows: number; frame: number }) {
  // Reserve top rows for the stats bar
  const gridRows = rows - 4
  const gridCols = Math.floor(cols / 2) // each cell is 2 chars wide

  return (
    <Box flexDirection="column">
      {Array.from({ length: gridRows }, (_, y) => (
        <Box key={y} flexDirection="row">
          {Array.from({ length: gridCols }, (_, x) => (
            <Text key={x} color={cellColor(x, y, frame)}>
              {cellChar(x, y, frame) + ' '}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({
  fps,
  frame,
  cols,
  rows,
}: {
  fps: number
  frame: number
  cols: number
  rows: number
}) {
  const fpsColor = fps >= 55 ? 'green' : fps >= 30 ? 'yellow' : 'red'
  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={2} marginBottom={1}>
      <Text bold color="cyan">
        ratatat stress test{'  '}
      </Text>
      <Text>
        FPS: <Text color={fpsColor} bold>{String(fps).padStart(3)}</Text>
        {'  '}
        Frame: <Text color="white">{String(frame).padStart(7)}</Text>
        {'  '}
        Terminal: <Text color="white">{cols}×{rows}</Text>
        {'  '}
        Cells/frame: <Text color="white">{(Math.floor(cols / 2) * (rows - 4)).toLocaleString()}</Text>
        {'  '}
        <Text dim>Ctrl+C to exit</Text>
      </Text>
    </Box>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

function StressTest() {
  const { columns, rows } = useWindowSize()
  const { fps, tick } = useFps()
  const [frame, setFrame] = useState(0)
  const { exit } = useApp()

  useEffect(() => {
    let running = true
    let animFrame: ReturnType<typeof setTimeout>

    function loop() {
      if (!running) return
      setFrame(f => {
        tick()
        return f + 1
      })
      // Schedule next frame — setTimeout(0) yields to React between frames
      animFrame = setTimeout(loop, 0)
    }

    loop()
    return () => {
      running = false
      clearTimeout(animFrame)
    }
  }, [tick])

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <StatsBar fps={fps} frame={frame} cols={columns} rows={rows} />
      <Grid cols={columns} rows={rows} frame={frame} />
    </Box>
  )
}

render(<StressTest />)
