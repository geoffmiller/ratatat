/**
 * kitchen-sink.tsx — ratatat interactive kitchen sink
 *
 * Navigate sections with ← → arrow keys. Each section fills the viewport.
 * Sections: Borders · Colors · Text · Backgrounds · Layout · Focus · Graph · Live · Incremental · UI · Htop · Static
 *
 * The Graph section renders an animated bar chart directly to the Uint32Array
 * buffer (bypassing React reconciliation for individual bars) — same technique
 * as the stress test.
 *
 * Controls:
 *   ← →     navigate sections
 *   Tab      cycle focus (Focus section)
 *   Q        quit
 *   Ctrl+C   quit
 *
 * Run: node --import @oxc-node/core/register examples/kitchen-sink.tsx
 */
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import os from 'os'
import { exec } from 'child_process'
import {
  render, Box, Text, Newline, Spacer,
  useApp, useWindowSize, useInput, useFocus, useFocusManager,
  DevTools, Static,
} from '../dist/index.js'

// ─── Section list ─────────────────────────────────────────────────────────────

const SECTIONS = ['Borders', 'Colors', 'Text', 'Backgrounds', 'Layout', 'Focus', 'Graph', 'Live', 'Incremental', 'UI', 'Htop', 'Static'] as const
type SectionName = typeof SECTIONS[number]

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeading({ title }: { title: string }) {
  return (
    <Box marginBottom={1}>
      <Text bold color="cyan">━━ {title} </Text>
      <Text dim>{'━'.repeat(Math.max(0, 40 - title.length - 4))}</Text>
    </Box>
  )
}

// ─── Borders ──────────────────────────────────────────────────────────────────

function BordersSection() {
  const styles = ['single', 'double', 'round', 'bold', 'singleDouble', 'doubleSingle', 'classic'] as const
  return (
    <Box flexDirection="column">
      <SectionHeading title="Borders" />
      <Box flexDirection="row" gap={1} flexWrap="wrap" marginBottom={2}>
        {styles.map(s => (
          <Box key={s} borderStyle={s} paddingX={2} paddingY={1}>
            <Text color="white">{s}</Text>
          </Box>
        ))}
      </Box>
      <Box flexDirection="row" gap={2}>
        <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
          <Text color="cyan">borderColor</Text>
        </Box>
        <Box borderStyle="bold" borderColor="yellow" paddingX={2} paddingY={1}>
          <Text color="yellow">bold + yellow</Text>
        </Box>
        <Box borderStyle="double" borderColor="magenta" paddingX={2} paddingY={1}>
          <Text color="magenta">double + magenta</Text>
        </Box>
      </Box>
    </Box>
  )
}

// ─── Colors ───────────────────────────────────────────────────────────────────

function ColorsSection() {
  const named = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray']
  const hexes = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff', '#ff9f43', '#f8961e', '#90e0ef']
  return (
    <Box flexDirection="column">
      <SectionHeading title="Colors" />
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text dim>Named colors</Text>
          <Box flexDirection="row" gap={1}>
            {named.map(c => (
              <Box key={c} backgroundColor={c} paddingX={1}>
                <Text color={c === 'white' || c === 'yellow' ? 'black' : 'white'}>{c}</Text>
              </Box>
            ))}
          </Box>
        </Box>
        <Box flexDirection="column">
          <Text dim>Hex colors</Text>
          <Box flexDirection="row" gap={1}>
            {hexes.map(h => (
              <Box key={h} backgroundColor={h} paddingX={1}>
                <Text color="black">{h}</Text>
              </Box>
            ))}
          </Box>
        </Box>
        <Box flexDirection="column">
          <Text dim>RGB colors</Text>
          <Box flexDirection="row" gap={1}>
            {[
              ['rgb(255,100,100)', 'R'],
              ['rgb(100,255,100)', 'G'],
              ['rgb(100,100,255)', 'B'],
              ['rgb(255,200,0)',   'Y'],
              ['rgb(200,100,255)', 'P'],
              ['rgb(0,200,200)',   'C'],
            ].map(([c, label]) => (
              <Box key={c} backgroundColor={c} paddingX={2} paddingY={1}>
                <Text color="black" bold>{label}</Text>
                <Newline />
                <Text color="black" dim>{c}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

// ─── Text styles ──────────────────────────────────────────────────────────────

function TextSection() {
  return (
    <Box flexDirection="column">
      <SectionHeading title="Text Styles" />
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" gap={3}>
          <Text bold>bold</Text>
          <Text italic>italic</Text>
          <Text underline>underline</Text>
          <Text dim>dim</Text>
          <Text bold italic>bold+italic</Text>
          <Text bold underline color="yellow">bold+underline+yellow</Text>
          <Text italic dim color="cyan">italic+dim+cyan</Text>
        </Box>
        <Box flexDirection="row" gap={2} marginTop={1}>
          {['red','green','yellow','blue','magenta','cyan','white'].map(c => (
            <Text key={c} color={c} bold>{c[0].toUpperCase()}</Text>
          ))}
          <Text>  </Text>
          {['red','green','yellow','blue','magenta','cyan','white'].map(c => (
            <Text key={c} color={c} italic>{c[0].toUpperCase()}</Text>
          ))}
          <Text>  </Text>
          {['red','green','yellow','blue','magenta','cyan','white'].map(c => (
            <Text key={c} color={c} dim>{c[0].toUpperCase()}</Text>
          ))}
        </Box>
        <Box flexDirection="column" marginTop={1} gap={1} borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
          <Text bold color="cyan">Combined styles demo</Text>
          <Text>Normal <Text bold>Bold</Text> Normal <Text italic>Italic</Text> Normal <Text underline>Underline</Text></Text>
          <Text color="green">Green <Text color="yellow">Yellow</Text> <Text color="red">Red</Text> <Text color="cyan">Cyan</Text></Text>
          <Text dim>Dimmed text looks like this — useful for hints</Text>
        </Box>
      </Box>
    </Box>
  )
}

// ─── Backgrounds ─────────────────────────────────────────────────────────────

function BackgroundsSection() {
  return (
    <Box flexDirection="column">
      <SectionHeading title="Backgrounds" />
      <Box flexDirection="row" gap={1} flexWrap="wrap">
        {[
          ['red',     'white'],
          ['green',   'black'],
          ['yellow',  'black'],
          ['blue',    'white'],
          ['magenta', 'white'],
          ['cyan',    'black'],
          ['white',   'black'],
          ['gray',    'white'],
        ].map(([bg, fg]) => (
          <Box key={bg} backgroundColor={bg} paddingX={2} paddingY={1}>
            <Text color={fg} bold>{bg}</Text>
          </Box>
        ))}
      </Box>
      <Box flexDirection="row" gap={1} marginTop={1} flexWrap="wrap">
        {['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#c77dff','#ff9f43','#f8961e','#90e0ef'].map(h => (
          <Box key={h} backgroundColor={h} paddingX={2} paddingY={1}>
            <Text color="black">{h}</Text>
          </Box>
        ))}
      </Box>
      <Box flexDirection="row" gap={2} marginTop={1}>
        <Box backgroundColor="rgb(40,40,80)" paddingX={3} paddingY={1} borderStyle="round" borderColor="blue">
          <Text color="white" bold>Dark blue bg</Text>
        </Box>
        <Box backgroundColor="rgb(80,40,40)" paddingX={3} paddingY={1} borderStyle="round" borderColor="red">
          <Text color="white" bold>Dark red bg</Text>
        </Box>
        <Box backgroundColor="rgb(40,80,40)" paddingX={3} paddingY={1} borderStyle="round" borderColor="green">
          <Text color="white" bold>Dark green bg</Text>
        </Box>
      </Box>
    </Box>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function LayoutSection() {
  return (
    <Box flexDirection="column">
      <SectionHeading title="Layout (Flexbox)" />
      <Box flexDirection="row" gap={3}>
        {/* justify-content */}
        <Box flexDirection="column" gap={1}>
          <Text dim bold>justifyContent</Text>
          {(['flex-start', 'center', 'flex-end', 'space-between', 'space-around'] as const).map(j => (
            <Box key={j} borderStyle="single" borderColor="gray" width={26} justifyContent={j}>
              <Text color="yellow">▪</Text>
              <Text color="cyan">▪</Text>
              <Text color="green">▪</Text>
            </Box>
          ))}
        </Box>
        {/* align-items */}
        <Box flexDirection="column" gap={1}>
          <Text dim bold>alignItems</Text>
          {(['flex-start', 'center', 'flex-end'] as const).map(a => (
            <Box key={a} borderStyle="single" borderColor="gray" width={16} height={3} alignItems={a}>
              <Text color="magenta">▪▪▪</Text>
            </Box>
          ))}
        </Box>
        {/* Spacer + nesting */}
        <Box flexDirection="column" gap={1}>
          <Text dim bold>Spacer / nesting</Text>
          <Box borderStyle="single" borderColor="gray" width={24}>
            <Text color="green">◀ left</Text>
            <Spacer />
            <Text color="red">right ▶</Text>
          </Box>
          <Box borderStyle="round" borderColor="cyan" width={24} padding={1}>
            <Box borderStyle="single" borderColor="yellow" paddingX={1}>
              <Text color="yellow">nested</Text>
            </Box>
          </Box>
          <Box flexDirection="row" gap={1}>
            {[1,2,3].map(n => (
              <Box key={n} borderStyle="single" borderColor="blue" width={6} height={n+1} alignItems="center" justifyContent="center">
                <Text color="blue">{n}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

// ─── Focus ────────────────────────────────────────────────────────────────────

function FocusablePanel({ label, color, description }: { label: string; color: string; description: string }) {
  const { isFocused } = useFocus()
  return (
    <Box
      flexDirection="column"
      borderStyle={isFocused ? 'round' : 'single'}
      borderColor={isFocused ? color : 'gray'}
      paddingX={2}
      paddingY={1}
      width={18}
    >
      <Text color={isFocused ? color : 'gray'} bold>
        {isFocused ? '▶ ' : '  '}{label}
      </Text>
      <Text dim>{description}</Text>
      {isFocused && <Text color={color} dim>focused ✓</Text>}
    </Box>
  )
}

function FocusSection() {
  const { activeId } = useFocusManager()
  const panels = [
    { label: 'Alpha',   color: 'green',   description: 'panel one' },
    { label: 'Beta',    color: 'yellow',  description: 'panel two' },
    { label: 'Gamma',   color: 'magenta', description: 'panel three' },
    { label: 'Delta',   color: 'cyan',    description: 'panel four' },
    { label: 'Epsilon', color: 'blue',    description: 'panel five' },
  ]
  return (
    <Box flexDirection="column">
      <SectionHeading title="Focus Management" />
      <Text dim marginBottom={1}>Tab / Shift+Tab to cycle focus between panels</Text>
      <Box flexDirection="row" gap={1}>
        {panels.map(p => (
          <FocusablePanel key={p.label} {...p} />
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dim>Active ID: </Text>
        <Text color="cyan">{activeId ?? 'none'}</Text>
      </Box>
    </Box>
  )
}

// ─── Graph ────────────────────────────────────────────────────────────────────
// Bar chart rendered directly to the Uint32Array buffer — bypasses React
// reconciliation for individual bar cells, same technique as stress-test.tsx.

// Bar colors by column (ANSI indices)
const BAR_COLORS = [1, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6]

// Block characters for vertical bars (bottom to top)
const FULL_BLOCK = '█'.codePointAt(0)!
const SHADE_75   = '▓'.codePointAt(0)!
const SHADE_50   = '▒'.codePointAt(0)!
const SHADE_25   = '░'.codePointAt(0)!
const SPACE      = 0x20

/**
 * Paint an animated bar chart into the buffer.
 * Called from the 'render' event listener — paints into the region below
 * the React-managed heading/axis rows.
 */
function paintGraph(
  buffer: Uint32Array,
  cols: number,
  _rows: number,
  startRow: number,    // first row available for bars
  barRows: number,     // total bar height in rows
  frame: number,
) {
  const BAR_COUNT = 12
  const BAR_WIDTH = 3
  const BAR_GAP   = 1
  const TOTAL_WIDTH = BAR_COUNT * (BAR_WIDTH + BAR_GAP)
  const startCol = Math.max(0, Math.floor((cols - TOTAL_WIDTH) / 2))

  // Compute bar heights (0..barRows) driven by animated sine waves
  // Same time scale as the React display: t = frame * 0.004
  const heights: number[] = []
  for (let b = 0; b < BAR_COUNT; b++) {
    const phase = (b / BAR_COUNT) * Math.PI * 2
    const t = frame * 0.004
    const v = (Math.sin(t + phase) * 0.5 + 0.5) *
              (Math.sin(t * 0.37 + phase * 1.3) * 0.3 + 0.7)
    heights.push(Math.max(1, Math.round(v * barRows)))
  }

  // Clear graph region first
  for (let row = startRow; row < startRow + barRows; row++) {
    for (let col = startCol; col < startCol + TOTAL_WIDTH; col++) {
      const idx = (row * cols + col) * 2
      buffer[idx] = SPACE
      buffer[idx + 1] = (0 << 16) | (255 << 8) | 255
    }
  }

  // Paint bars bottom-up
  for (let b = 0; b < BAR_COUNT; b++) {
    const barH = heights[b]
    const fg = BAR_COLORS[b % BAR_COLORS.length]
    const colStart = startCol + b * (BAR_WIDTH + BAR_GAP)

    for (let row = startRow; row < startRow + barRows; row++) {
      // distance from bottom of chart
      const fromBottom = (startRow + barRows - 1) - row
      const char = fromBottom < barH ? FULL_BLOCK : SPACE
      const attr = (0 << 16) | (255 << 8) | fg

      for (let dc = 0; dc < BAR_WIDTH; dc++) {
        const col = colStart + dc
        if (col >= cols) continue
        const idx = (row * cols + col) * 2
        buffer[idx] = char
        buffer[idx + 1] = attr
      }
    }
  }

  // Paint bar labels (A–L) at the bottom row
  const labelRow = startRow + barRows
  if (labelRow * cols * 2 + cols * 2 <= buffer.length) {
    for (let b = 0; b < BAR_COUNT; b++) {
      const fg = BAR_COLORS[b % BAR_COLORS.length]
      const colStart = startCol + b * (BAR_WIDTH + BAR_GAP) + 1
      const idx = (labelRow * cols + colStart) * 2
      if (idx + 1 < buffer.length) {
        buffer[idx] = 65 + b  // 'A'..'L'
        buffer[idx + 1] = (0 << 16) | (255 << 8) | fg
      }
    }
  }
}

// How many rows the React heading occupies before the bars start
// TabBar(3) + paddingTop(1) + SectionHeading(1) + subtitle(1) + values(1) + marginTop(1) = 8
const GRAPH_HEADER_ROWS = 8

function GraphSection({ active }: { active: boolean }) {
  const { columns, rows } = useWindowSize()
  const [frame, setFrame] = useState(0)
  const barRows = Math.max(4, rows - GRAPH_HEADER_ROWS - 6)

  const onTick = React.useCallback((f: number) => setFrame(f), [])
  useAnimationLoop(active, onTick)

  // Keep global frame ref for the buffer painter
  useEffect(() => { ;(globalThis as any).__kitchenFrame = frame })

  useEffect(() => {
    if (!active) return
    const app = (globalThis as any).__ratatatApp
    if (!app) return

    const onRender = (buffer: Uint32Array, w: number, h: number) => {
      const f = (globalThis as any).__kitchenFrame ?? 0
      paintGraph(buffer, w, h, GRAPH_HEADER_ROWS, barRows, f)
    }
    app.on('render', onRender)
    return () => app.off('render', onRender)
  }, [active, barRows])

  const BAR_COUNT = 12
  const BAR_WIDTH = 3
  const BAR_GAP   = 1
  const TOTAL_WIDTH = BAR_COUNT * (BAR_WIDTH + BAR_GAP)

  // Animation time advances at a fixed rate regardless of FPS.
  // frame increments at ~setTimeout(0) speed, so we scale it down
  // so the wave completes a cycle in ~4 seconds visually.
  const t = frame * 0.004  // ~4s per full cycle at 500fps, ~0.4s at 50fps

  // Compute heights for the value display and buffer painter
  const heights: number[] = []
  for (let b = 0; b < BAR_COUNT; b++) {
    const phase = (b / BAR_COUNT) * Math.PI * 2
    const v = (Math.sin(t + phase) * 0.5 + 0.5) *
              (Math.sin(t * 0.37 + phase * 1.3) * 0.3 + 0.7)
    heights.push(Math.max(1, Math.round(v * barRows)))
  }

  const barColors = ['red','green','yellow','blue','magenta','cyan','white']
  const pcts = heights.map(h => Math.round((h / barRows) * 100))

  return (
    <Box flexDirection="column">
      <SectionHeading title="Animated Bar Chart" />
      <Text dim>Sine-wave driven bars, painted directly to buffer (bypasses React reconciler)</Text>
      <Box marginTop={1}>
        <Text dim>  </Text>
        {pcts.map((p, i) => (
          <Text key={i} color={barColors[i % barColors.length]}>{String(p).padStart(3)}%</Text>
        ))}
      </Box>
      {/* The bars themselves are painted into the buffer by paintGraph() above */}
      {/* Reserve vertical space so React lays out the heading correctly */}
      <Box height={barRows + 1} />
    </Box>
  )
}

// ─── Live ─────────────────────────────────────────────────────────────────────

function LiveSection() {
  const { columns, rows } = useWindowSize()
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setFrame(f => f + 1), 100)
    return () => clearInterval(t)
  }, [])

  const now = new Date()
  const time = now.toTimeString().split(' ')[0]
  const date = now.toDateString()

  const sparkData = Array.from({ length: 40 }, (_, i) => {
    const f = frame - 39 + i
    return Math.abs(Math.sin(f * 0.3) * 7) | 0
  })
  const sparkChars = ['▁','▂','▃','▄','▅','▆','▇','█']

  // Benchmark data — matches bench.js output
  const benchRows = [
    { label: 'initial mount (simple)',   ratatat: '67,630', ink: '8,215',   speedup: '8.2×',  note: 'ops/sec ↑  cold reconcile, 2 text nodes'           },
    { label: 'initial mount (complex)',  ratatat: '41,253', ink: '1,421',   speedup: '29×',   note: 'ops/sec ↑  cold reconcile, borders + 3 panels'      },
    { label: 'rerender (simple)',        ratatat: '95,175', ink: '8,095',   speedup: '11.8×', note: 'ops/sec ↑  warm tree, counter increments each frame' },
    { label: 'rerender (complex)',       ratatat: '49,852', ink: '1,384',   speedup: '36×',   note: 'ops/sec ↑  warm tree, all panels update each frame'  },
    { label: 'p99 latency (complex)',    ratatat: '23 µs',  ink: '1,586 µs',speedup: '68×',   note: 'time/op ↓  worst-case frame — tail latency matters'  },
  ]

  return (
    <Box flexDirection="column" gap={1}>
      <SectionHeading title="Live Stats" />

      {/* Clock row */}
      <Box flexDirection="row" gap={3} borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
        <Box flexDirection="column" width={12}>
          <Text dim>Time</Text>
          <Text color="green" bold>{time}</Text>
        </Box>
        <Box flexDirection="column" width={22}>
          <Text dim>Date</Text>
          <Text color="cyan">{date}</Text>
        </Box>
        <Box flexDirection="column" width={10}>
          <Text dim>Frame</Text>
          <Text color="yellow" bold>{frame}</Text>
        </Box>
        <Box flexDirection="column" width={14}>
          <Text dim>Terminal</Text>
          <Text color="magenta" bold>{columns}×{rows}</Text>
        </Box>
        <Box flexDirection="column">
          <Text dim>Sparkline</Text>
          <Box flexDirection="row">
            {sparkData.map((v, i) => (
              <Text key={i} color={v > 5 ? 'green' : v > 3 ? 'yellow' : 'red'}>
                {sparkChars[v]}
              </Text>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Benchmark table */}
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={2} paddingY={1}>
        <Box flexDirection="row" marginBottom={1}>
          <Text bold color="yellow">ratatat vs Ink — benchmark  </Text>
          <Text dim>ops/sec, higher is better</Text>
        </Box>
        {/* Header */}
        <Box flexDirection="row">
          <Text dim bold>{'Suite'.padEnd(28)}</Text>
          <Text dim bold>{'ratatat'.padEnd(14)}</Text>
          <Text dim bold>{'Ink'.padEnd(14)}</Text>
          <Text dim bold>{'Speedup'.padEnd(10)}</Text>
          <Text dim bold>Notes</Text>
        </Box>
        <Box flexDirection="row"><Text dim>{'─'.repeat(74)}</Text></Box>
        {/* Rows */}
        {benchRows.map((r, i) => (
          <Box key={i} flexDirection="row">
            <Text color="white">{r.label.padEnd(28)}</Text>
            <Text color="cyan"  bold>{r.ratatat.padEnd(14)}</Text>
            <Text color="gray">{r.ink.padEnd(14)}</Text>
            <Text color="green" bold>{'🚀 ' + r.speedup.padEnd(7)}</Text>
            <Text dim>{r.note}</Text>
          </Box>
        ))}
        <Box flexDirection="row" marginTop={1}>
          <Text dim>stress test  </Text>
          <Text color="green" bold>303 FPS sustained</Text>
          <Text dim>  ·  8,648 cells/frame  ·  188×50 terminal  ·  zero memory growth</Text>
        </Box>
      </Box>
    </Box>
  )
}

// ─── Incremental rendering ────────────────────────────────────────────────────

const INC_SERVICES = [
  'Server Authentication Module - Handles JWT token validation, OAuth2 flows, and session management',
  'Database Connection Pool - Maintains persistent connections to PostgreSQL with automatic failover',
  'API Gateway Service - Routes HTTP requests to microservices with rate limiting and transformation',
  'User Profile Manager - Caches user data in Redis with write-through policy and invalidation',
  'Payment Processing Engine - Integrates with Stripe, PayPal, and Square for transaction processing',
  'Email Notification Queue - Processes outbound emails through SendGrid with retry logic',
  'File Storage Handler - Manages S3 bucket operations with multipart uploads and CDN integration',
  'Search Indexer Service - Maintains Elasticsearch indices with real-time document updates',
  'Metrics Aggregation Pipeline - Collects telemetry data for Prometheus and Grafana dashboards',
  'WebSocket Connection Manager - Handles real-time bidirectional communication for chat',
  'Cache Invalidation Service - Coordinates distributed cache updates across Redis cluster nodes',
  'Background Job Processor - Executes async tasks via RabbitMQ with dead letter queue handling',
  'Rate Limiter Module - Enforces API quotas using token bucket algorithm with Redis backend',
  'Health Check Monitor - Performs periodic service health checks with circuit breaker pattern',
  'Configuration Manager - Loads environment-specific settings from Consul with hot reload',
]

const INC_ACTIONS = ['PROCESSING', 'COMPLETED', 'UPDATING', 'SYNCING', 'VALIDATING', 'EXECUTING']

function incLogLine(index: number) {
  const ts = new Date().toLocaleTimeString()
  const action = INC_ACTIONS[Math.floor(Math.random() * INC_ACTIONS.length)]
  return `[${ts}] Worker-${index} ${action}: ${(Math.random()*1000).toFixed(0)}req/s  ${(Math.random()*512).toFixed(1)}MB  CPU ${(Math.random()*100).toFixed(1)}%`
}

function incProgressBar(value: number, width = 24) {
  const filled = Math.floor((value / 100) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

function IncrementalSection({ active }: { active: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString())
  const [counter, setCounter] = useState(0)
  const [fps, setFps] = useState(0)
  const [p1, setP1] = useState(0)
  const [p2, setP2] = useState(33)
  const [p3, setP3] = useState(66)
  const [randVal, setRandVal] = useState(0)
  const LOG_COUNT = 4
  const [logLines, setLogLines] = useState(() =>
    Array.from({ length: LOG_COUNT }, (_, i) => incLogLine(i))
  )

  // Clock — 1s
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      setTimestamp(new Date().toLocaleTimeString())
      setCounter(c => c + 1)
    }, 1000)
    return () => clearInterval(t)
  }, [active])

  // High-freq updates — ~60fps
  useEffect(() => {
    if (!active) return
    let frameCount = 0, lastFps = Date.now(), loopFrame = 0
    const t = setInterval(() => {
      loopFrame++
      setP1(p => (p + 1) % 101)
      setP2(p => (p + 2) % 101)
      setP3(p => (p + 3) % 101)
      setRandVal(Math.floor(Math.random() * 1000))
      setLogLines(prev => {
        const next = [...prev]
        next[Math.floor(Math.random() * next.length)] = incLogLine(Math.floor(Math.random() * LOG_COUNT))
        return next
      })
      frameCount++
      const now = Date.now()
      if (now - lastFps >= 1000) { setFps(frameCount); frameCount = 0; lastFps = now }
      if (loopFrame % 10000 === 0) {
        try { performance.clearMeasures(); performance.clearMarks() } catch {}
      }
    }, 16)
    return () => clearInterval(t)
  }, [active])

  useInput((input, key) => {
    if (!active) return
    if (key.upArrow)   setSelectedIndex(i => (i === 0 ? INC_SERVICES.length - 1 : i - 1))
    if (key.downArrow) setSelectedIndex(i => (i === INC_SERVICES.length - 1 ? 0 : i + 1))
  })

  const fpsColor = fps >= 55 ? 'green' : fps >= 30 ? 'yellow' : 'red'

  return (
    <Box flexDirection="column" gap={1}>
      <SectionHeading title="Incremental Rendering" />

      {/* Header stats */}
      <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} flexShrink={0}>
        <Box flexDirection="column">
          <Box flexDirection="row" gap={4}>
            <Text>Time: <Text color="green" bold>{timestamp}</Text></Text>
            <Text>Updates: <Text color="yellow" bold>{counter}</Text></Text>
            <Text>Rand: <Text color="cyan">{randVal}</Text></Text>
            <Text>FPS: <Text color={fpsColor} bold>{fps || '--'}</Text></Text>
          </Box>
          <Text>P1: <Text color="green">{incProgressBar(p1)}</Text> <Text color="green">{String(p1).padStart(3)}%</Text></Text>
          <Text>P2: <Text color="yellow">{incProgressBar(p2)}</Text> <Text color="yellow">{String(p2).padStart(3)}%</Text></Text>
          <Text>P3: <Text color="red">{incProgressBar(p3)}</Text> <Text color="red">{String(p3).padStart(3)}%</Text></Text>
        </Box>
      </Box>

      {/* Live logs */}
      <Box borderStyle="single" borderColor="yellow" paddingX={2} paddingY={1} flexShrink={0}>
        <Box flexDirection="column">
          <Text bold color="yellow">Live Logs <Text dim>1-2 lines update per frame at ~60fps</Text></Text>
          {logLines.map((line, i) => (
            <Text key={i} color="green" dim>{line}</Text>
          ))}
        </Box>
      </Box>

      {/* Service list */}
      <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
        <Box flexDirection="column">
          <Text bold color="magenta">System Services <Text dim>↑↓ to navigate</Text></Text>
          {INC_SERVICES.map((svc, i) => {
            const selected = i === selectedIndex
            return (
              <Text key={i} color={selected ? 'cyan' : 'white'} bold={selected}>
                {selected ? '▶ ' : '  '}{svc}
              </Text>
            )
          })}
        </Box>
      </Box>

      {/* Selected footer */}
      <Box borderStyle="round" borderColor="magenta" paddingX={2} flexShrink={0}>
        <Text dim>Selected: </Text>
        <Text color="magenta" bold>{INC_SERVICES[selectedIndex].split(' - ')[0]}</Text>
      </Box>
    </Box>
  )
}

// ─── UI Primitives ────────────────────────────────────────────────────────────
// select-input + table — two foundational UI patterns side by side

const SELECT_COLORS = [
  { name: 'Red',     color: 'red'     },
  { name: 'Green',   color: 'green'   },
  { name: 'Yellow',  color: 'yellow'  },
  { name: 'Blue',    color: 'blue'    },
  { name: 'Magenta', color: 'magenta' },
  { name: 'Cyan',    color: 'cyan'    },
  { name: 'White',   color: 'white'   },
  { name: 'Gray',    color: 'gray'    },
]

const TABLE_USERS = [
  { id: 1,  name: 'ada_lovelace',    role: 'Engineer',  status: 'active'   },
  { id: 2,  name: 'grace_hopper',    role: 'Architect',  status: 'active'   },
  { id: 3,  name: 'alan_turing',     role: 'Researcher', status: 'idle'     },
  { id: 4,  name: 'margaret_hamilton',role: 'Lead',      status: 'active'   },
  { id: 5,  name: 'linus_torvalds',  role: 'Maintainer', status: 'active'   },
  { id: 6,  name: 'barbara_liskov',  role: 'Architect',  status: 'idle'     },
  { id: 7,  name: 'donald_knuth',    role: 'Researcher', status: 'inactive' },
  { id: 8,  name: 'john_mccarthy',   role: 'Engineer',   status: 'inactive' },
  { id: 9,  name: 'ken_thompson',    role: 'Engineer',   status: 'active'   },
  { id: 10, name: 'dennis_ritchie',  role: 'Engineer',   status: 'idle'     },
]

function statusColor(s: string) {
  return s === 'active' ? 'green' : s === 'idle' ? 'yellow' : 'gray'
}

function UiSection({ active }: { active: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useInput((_input, key) => {
    if (!active) return
    if (key.upArrow)   setSelectedIndex(i => (i === 0 ? SELECT_COLORS.length - 1 : i - 1))
    if (key.downArrow) setSelectedIndex(i => (i === SELECT_COLORS.length - 1 ? 0 : i + 1))
  })

  const selected = SELECT_COLORS[selectedIndex]

  return (
    <Box flexDirection="column" gap={1}>
      <SectionHeading title="UI Primitives" />
      <Text dim>Ports of Ink's select-input and table examples</Text>

      <Box flexDirection="row" gap={3}>

        {/* ── Select input ── */}
        <Box flexDirection="column" gap={1} width={26}>
          <Text bold>Color picker <Text dim>↑↓ to select</Text></Text>
          <Box flexDirection="column" borderStyle="round" borderColor={selected.color} paddingX={1} paddingY={1}>
            {SELECT_COLORS.map((item, i) => {
              const isSelected = i === selectedIndex
              return (
                <Box key={item.name} flexDirection="row">
                  <Text color={isSelected ? item.color : 'gray'} bold={isSelected}>
                    {isSelected ? '▶ ' : '  '}
                  </Text>
                  <Text color={isSelected ? item.color : 'gray'} bold={isSelected}>
                    {item.name}
                  </Text>
                </Box>
              )
            })}
          </Box>
          <Box borderStyle="single" borderColor={selected.color} paddingX={2} paddingY={1}>
            <Text>Selected: <Text color={selected.color} bold>{selected.name}</Text></Text>
          </Box>
        </Box>

        {/* ── Table ── */}
        <Box flexDirection="column" gap={1} flexGrow={1}>
          <Text bold>User table <Text dim>percentage-width columns</Text></Text>
          <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1} paddingY={1}>
            {/* Header */}
            <Box flexDirection="row" marginBottom={1}>
              <Box width="6%"><Text bold dim>ID</Text></Box>
              <Box width="35%"><Text bold dim>Username</Text></Box>
              <Box width="25%"><Text bold dim>Role</Text></Box>
              <Box width="20%"><Text bold dim>Status</Text></Box>
            </Box>
            {/* Divider */}
            <Box marginBottom={1}><Text dim>{'─'.repeat(58)}</Text></Box>
            {/* Rows */}
            {TABLE_USERS.map(user => (
              <Box key={user.id} flexDirection="row">
                <Box width="6%"><Text dim>{user.id}</Text></Box>
                <Box width="35%"><Text color="cyan">{user.name}</Text></Box>
                <Box width="25%"><Text color="white">{user.role}</Text></Box>
                <Box width="20%">
                  <Text color={statusColor(user.status)} bold>
                    {user.status === 'active' ? '● ' : user.status === 'idle' ? '○ ' : '· '}
                    {user.status}
                  </Text>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

      </Box>
    </Box>
  )
}

// ─── Htop ─────────────────────────────────────────────────────────────────────

// CPU utilization: diff two os.cpus() snapshots
type CpuSnapshot = ReturnType<typeof os.cpus>
function cpuPercents(prev: CpuSnapshot, curr: CpuSnapshot): number[] {
  return curr.map((cpu, i) => {
    const p = prev[i].times
    const c = cpu.times
    const prevTotal = p.user + p.nice + p.sys + p.idle + p.irq
    const currTotal = c.user + c.nice + c.sys + c.idle + c.irq
    const totalDiff = currTotal - prevTotal
    const idleDiff  = c.idle - p.idle
    if (totalDiff === 0) return 0
    return Math.round(((totalDiff - idleDiff) / totalDiff) * 100)
  })
}

interface ProcInfo {
  pid: string
  user: string
  cpu: number
  mem: number
  cmd: string
}

function readProcs(cb: (procs: ProcInfo[]) => void) {
  exec('ps aux', { timeout: 2000 }, (err, stdout) => {
    if (err) return cb([])
    const procs = stdout.trim().split('\n').slice(1).map(line => {
      const parts = line.trim().split(/\s+/)
      return {
        user: parts[0] ?? '',
        pid:  parts[1] ?? '',
        cpu:  parseFloat(parts[2] ?? '0'),
        mem:  parseFloat(parts[3] ?? '0'),
        cmd:  parts.slice(10).join(' '),
      }
    })
    cb(procs)
  })
}

function miniBar(pct: number, width: number, color: string) {
  const filled = Math.round((Math.min(pct, 100) / 100) * width)
  const empty  = width - filled
  return (
    <Box flexDirection="row">
      <Text color={color}>{'|'.repeat(filled)}</Text>
      <Text dim>{'·'.repeat(empty)}</Text>
    </Box>
  )
}

function formatUptime(secs: number) {
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0 || d > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

function formatMem(bytes: number) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + 'G'
  return (bytes / 1e6).toFixed(0) + 'M'
}

type HtopSort = 'cpu' | 'mem'

function HtopSection({ active }: { active: boolean }) {
  const { columns } = useWindowSize()
  const [cpuPcts, setCpuPcts]   = useState<number[]>(() => os.cpus().map(() => 0))
  const [memUsed, setMemUsed]   = useState(os.totalmem() - os.freemem())
  const [loadAvg, setLoadAvg]   = useState(os.loadavg())
  const [uptime,  setUptime]    = useState(os.uptime())
  const [procs,   setProcs]     = useState<ProcInfo[]>([])
  const [sort,    setSort]      = useState<HtopSort>('cpu')
  const prevCpus = useRef(os.cpus())

  useEffect(() => {
    if (!active) return
    // Initial process list (async — don't block event loop)
    readProcs(setProcs)

    const t = setInterval(() => {
      const curr = os.cpus()
      setCpuPcts(cpuPercents(prevCpus.current, curr))
      prevCpus.current = curr
      setMemUsed(os.totalmem() - os.freemem())
      setLoadAvg(os.loadavg())
      setUptime(os.uptime())
      readProcs(setProcs)
    }, 1000)
    return () => clearInterval(t)
  }, [active])

  useInput((input, _key) => {
    if (!active) return
    if (input === 'c' || input === 'C') setSort('cpu')
    if (input === 'm' || input === 'M') setSort('mem')
  })

  const totalMem = os.totalmem()
  const memPct   = Math.round((memUsed / totalMem) * 100)
  const cpuCount = cpuPcts.length
  const barW     = Math.max(8, Math.floor((columns - 20) / Math.min(cpuCount, 10)) - 2)

  const sorted = [...procs]
    .sort((a, b) => sort === 'cpu' ? b.cpu - a.cpu : b.mem - a.mem)
    .slice(0, 15)

  const hostname = os.hostname().split('.')[0]

  return (
    <Box flexDirection="column" gap={1}>

      {/* ── Header ── */}
      <Box flexDirection="row" gap={4} borderStyle="round" borderColor="green" paddingX={2} flexShrink={0}>
        <Text bold color="green">{hostname}</Text>
        <Text dim>up <Text color="white">{formatUptime(uptime)}</Text></Text>
        <Text dim>load <Text color={loadAvg[0] > cpuCount ? 'red' : loadAvg[0] > cpuCount * 0.7 ? 'yellow' : 'green'}>{loadAvg[0].toFixed(2)}</Text> <Text dim>{loadAvg[1].toFixed(2)} {loadAvg[2].toFixed(2)}</Text></Text>
        <Spacer />
        <Text dim>{cpuCount} cores · </Text>
        <Text color="cyan">{formatMem(totalMem)}</Text>
        <Text dim> RAM</Text>
      </Box>

      {/* ── CPU meters ── */}
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={2} paddingY={1} flexShrink={0}>
        <Text bold dim>CPU</Text>
        <Box flexDirection="row" flexWrap="wrap" gap={1} marginTop={1}>
          {cpuPcts.map((pct, i) => {
            const color = pct > 80 ? 'red' : pct > 50 ? 'yellow' : 'green'
            return (
              <Box key={i} flexDirection="row" width={barW + 12}>
                <Text dim>{String(i + 1).padStart(2)} </Text>
                <Text color={color}>[</Text>
                {miniBar(pct, barW, color)}
                <Text color={color}>]</Text>
                <Text color={color} bold> {String(pct).padStart(3)}%</Text>
              </Box>
            )
          })}
        </Box>
      </Box>

      {/* ── Memory bar ── */}
      <Box flexDirection="row" borderStyle="single" borderColor="gray" paddingX={2} paddingY={1} flexShrink={0} gap={2}>
        <Text bold dim>Mem</Text>
        <Text color="cyan">[</Text>
        {miniBar(memPct, 40, memPct > 80 ? 'red' : memPct > 60 ? 'yellow' : 'cyan')}
        <Text color="cyan">]</Text>
        <Text color="cyan" bold>{String(memPct).padStart(3)}%</Text>
        <Text dim>{formatMem(memUsed)} / {formatMem(totalMem)}</Text>
      </Box>

      {/* ── Process table ── */}
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={2} paddingY={1} flexGrow={1}>
        {/* Table header */}
        <Box flexDirection="row" marginBottom={1}>
          <Box width={7}><Text bold dim>PID</Text></Box>
          <Box width={14}><Text bold dim>USER</Text></Box>
          <Box width={8}>
            <Text bold color={sort === 'cpu' ? 'yellow' : undefined} dim={sort !== 'cpu'}>
              %CPU
            </Text>
          </Box>
          <Box width={8}>
            <Text bold color={sort === 'mem' ? 'yellow' : undefined} dim={sort !== 'mem'}>
              %MEM
            </Text>
          </Box>
          <Text bold dim>COMMAND</Text>
          <Spacer />
          <Text dim>sort: </Text>
          <Text color={sort === 'cpu' ? 'yellow' : 'gray'} bold={sort === 'cpu'}>C</Text>
          <Text dim>pu  </Text>
          <Text color={sort === 'mem' ? 'yellow' : 'gray'} bold={sort === 'mem'}>M</Text>
          <Text dim>em</Text>
        </Box>

        {sorted.map((p, i) => {
          const cpuColor = p.cpu > 50 ? 'red' : p.cpu > 20 ? 'yellow' : 'white'
          const memColor = p.mem > 10 ? 'red' : p.mem > 5 ? 'yellow' : 'white'
          const cmd = p.cmd.length > columns - 40 ? p.cmd.slice(0, columns - 43) + '…' : p.cmd
          // Truncate to basename if it's a long path
          const cmdDisplay = cmd.startsWith('/') ? cmd.split('/').pop() ?? cmd : cmd
          return (
            <Box key={p.pid} flexDirection="row">
              <Box width={7}><Text dim>{p.pid}</Text></Box>
              <Box width={14}><Text color="cyan">{p.user.slice(0, 12)}</Text></Box>
              <Box width={8}><Text color={cpuColor} bold={p.cpu > 20}>{p.cpu.toFixed(1).padStart(5)}</Text></Box>
              <Box width={8}><Text color={memColor}>{p.mem.toFixed(1).padStart(5)}</Text></Box>
              <Text color={i === 0 ? 'white' : 'gray'}>{cmdDisplay}</Text>
            </Box>
          )
        })}
      </Box>

    </Box>
  )
}

// ─── Tab bar (top) ───────────────────────────────────────────────────────────

function TabBar({ current }: { current: number }) {
  return (
    <Box borderStyle="single" borderColor="gray" flexShrink={0}>
      <Text> </Text>
      {SECTIONS.map((s, i) => {
        const active = i === current
        return (
          <Box key={s} marginRight={1}>
            {active ? (
              <Box backgroundColor="cyan" paddingX={1}>
                <Text color="black" bold>{s}</Text>
              </Box>
            ) : (
              <Box paddingX={1}>
                <Text color="gray">{s}</Text>
              </Box>
            )}
          </Box>
        )
      })}
      <Spacer />
      <Text dim>◀ ▶  </Text>
      <Text dim>Tab  </Text>
      <Text dim>Q quit </Text>
    </Box>
  )
}

// ─── Static section ──────────────────────────────────────────────────────────

type Task = { id: number; name: string; ms: number; ok: boolean }

const TASK_NAMES = [
  'Compile TypeScript', 'Bundle assets', 'Run unit tests', 'Lint source',
  'Type check', 'Generate docs', 'Minify CSS', 'Optimize images',
  'Build WASM', 'Sign artifacts', 'Upload to CDN', 'Notify Slack',
]

function StaticSection({ active }: { active: boolean }) {
  const [tasks, setTasks]     = useState<Task[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const counterRef = useRef(0)

  useEffect(() => {
    if (!active) return
    let cancelled = false

    const runNext = () => {
      if (cancelled) return
      const i   = counterRef.current % TASK_NAMES.length
      const name = TASK_NAMES[i]!
      const ms   = 200 + Math.floor(Math.random() * 600)
      setRunning(name)

      setTimeout(() => {
        if (cancelled) return
        const ok = Math.random() > 0.1
        setTasks(prev => [
          ...prev,
          { id: counterRef.current, name, ms, ok },
        ])
        counterRef.current++
        setRunning(null)
        setTimeout(runNext, 150)
      }, ms)
    }

    setTimeout(runNext, 300)
    return () => { cancelled = true }
  }, [active])

  const passed = tasks.filter(t => t.ok).length
  const failed  = tasks.filter(t => !t.ok).length

  return (
    <Box flexDirection="column" height="100%">
      <Box marginBottom={1}>
        <Text bold>Static</Text>
        <Text dim> — completed tasks freeze in place, never re-rendered</Text>
      </Box>

      {/* Completed tasks — Static means these nodes are frozen in Yoga after first paint */}
      <Static items={tasks}>
        {(task: Task) => (
          <Box key={task.id}>
            <Text color={task.ok ? 'green' : 'red'}>{task.ok ? ' ✔' : ' ✘'} </Text>
            <Box width={24}><Text>{task.name}</Text></Box>
            <Text dim>{task.ms}ms</Text>
          </Box>
        )}
      </Static>

      {/* Live status — this part re-renders; Static items above do not */}
      <Box marginTop={1} flexDirection="column">
        {running && (
          <Box>
            <Text color="yellow"> ⟳ </Text>
            <Text>{running}</Text>
            <Text dim>…</Text>
          </Box>
        )}
        {!running && tasks.length > 0 && (
          <Box>
            <Text dim>idle</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text dim>total: {tasks.length}  </Text>
          <Text color="green">✔ {passed}  </Text>
          {failed > 0 && <Text color="red">✘ {failed}</Text>}
        </Box>
      </Box>
    </Box>
  )
}

// ─── Animated sections drive their own tick loop ─────────────────────────────
// Static sections (Borders, Colors, etc.) produce no renders when idle — the
// FPS HUD will show the true rate, not a forced 10 FPS from an unnecessary timer.

function useAnimationLoop(active: boolean, onTick: (frame: number) => void) {
  const frameRef = React.useRef(0)
  useEffect(() => {
    if (!active) return
    let running = true
    let handle: ReturnType<typeof setTimeout>
    function loop() {
      if (!running) return
      frameRef.current++
      onTick(frameRef.current)
      // Clear React scheduler perf entries every 10k frames to prevent
      // the MaxPerformanceEntryBufferExceededWarning from Node's perf_hooks
      if (frameRef.current % 10000 === 0) {
        try { performance.clearMeasures(); performance.clearMarks() } catch {}
      }
      handle = setTimeout(loop, 0)
    }
    loop()
    return () => { running = false; clearTimeout(handle) }
  }, [active, onTick])
}

// ─── App ─────────────────────────────────────────────────────────────────────

function KitchenSink() {
  const { exit } = useApp()
  const [sectionIdx, setSectionIdx] = useState(0)

  useInput((input, key) => {
    if (input === 'q' || input === 'Q') exit()
    if (key.rightArrow) setSectionIdx(i => Math.min(i + 1, SECTIONS.length - 1))
    if (key.leftArrow)  setSectionIdx(i => Math.max(i - 1, 0))
  })

  const currentSection = SECTIONS[sectionIdx]
  const isGraphActive = currentSection === 'Graph'
  const isIncActive   = currentSection === 'Incremental'
  const isUiActive    = currentSection === 'UI'
  const isHtopActive  = currentSection === 'Htop'
  const isStaticActive = currentSection === 'Static'

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Tab bar at top */}
      <TabBar current={sectionIdx} />

      {/* Section content fills remaining space */}
      <Box flexDirection="column" flexGrow={1} paddingX={2} paddingTop={1}>
        {currentSection === 'Borders'     && <BordersSection />}
        {currentSection === 'Colors'      && <ColorsSection />}
        {currentSection === 'Text'        && <TextSection />}
        {currentSection === 'Backgrounds' && <BackgroundsSection />}
        {currentSection === 'Layout'      && <LayoutSection />}
        {currentSection === 'Focus'       && <FocusSection />}
        {currentSection === 'Graph'       && <GraphSection active={isGraphActive} />}
        {currentSection === 'Live'        && <LiveSection />}
        {currentSection === 'Incremental' && <IncrementalSection active={isIncActive} />}
        {currentSection === 'UI'          && <UiSection active={isUiActive} />}
        {currentSection === 'Htop'        && <HtopSection active={isHtopActive} />}
        {currentSection === 'Static'      && <StaticSection active={isStaticActive} />}
      </Box>
    </Box>
  )
}

const { app } = render(
  <DevTools>
    <KitchenSink />
  </DevTools>
)
;(globalThis as any).__ratatatApp = app
