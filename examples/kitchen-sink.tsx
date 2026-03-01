/**
 * kitchen-sink.tsx — ratatat kitchen sink demo
 *
 * One app showing every major ratatat feature:
 *   - All 7 border styles
 *   - Named, hex, and RGB colors
 *   - Text styles: bold, italic, dim, underline
 *   - Flexbox: row/column, justify-content, align-items, gap
 *   - Spacer (push items to edges)
 *   - Live clock + frame counter (reactivity)
 *   - Focus cycling with Tab / Shift+Tab
 *   - useWindowSize live display
 *   - useApp().exit()
 *
 * Run: node --import @oxc-node/core/register examples/kitchen-sink.tsx
 */
// @ts-nocheck
import React, { useState, useEffect } from 'react'
import {
  render, Box, Text, Newline, Spacer,
  useApp, useWindowSize, useInput, useFocus, useFocusManager,
} from '../dist/index.js'

// ─── Section header ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="cyan">── {title} </Text>
      <Box marginLeft={2} flexDirection="column">
        {children}
      </Box>
    </Box>
  )
}

// ─── Borders ──────────────────────────────────────────────────────────────────

function BordersSection() {
  const styles = ['single', 'double', 'round', 'bold', 'singleDouble', 'doubleSingle', 'classic'] as const
  return (
    <Section title="Borders">
      <Box flexDirection="row" gap={1} flexWrap="wrap">
        {styles.map(s => (
          <Box key={s} borderStyle={s} paddingX={1}>
            <Text>{s}</Text>
          </Box>
        ))}
      </Box>
    </Section>
  )
}

// ─── Colors ───────────────────────────────────────────────────────────────────

function ColorsSection() {
  const named = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray']
  const hexes = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff', '#ff9f43']
  return (
    <Section title="Colors">
      <Box flexDirection="row" gap={1} marginBottom={1}>
        {named.map(c => (
          <Text key={c} color={c}>{c}</Text>
        ))}
      </Box>
      <Box flexDirection="row" gap={1} marginBottom={1}>
        {hexes.map(h => (
          <Text key={h} color={h}>{h}</Text>
        ))}
      </Box>
      <Box flexDirection="row" gap={1}>
        <Text color="rgb(255,100,100)">rgb(255,100,100)</Text>
        <Text color="rgb(100,255,100)">rgb(100,255,100)</Text>
        <Text color="rgb(100,100,255)">rgb(100,100,255)</Text>
      </Box>
    </Section>
  )
}

// ─── Text styles ──────────────────────────────────────────────────────────────

function TextStylesSection() {
  return (
    <Section title="Text Styles">
      <Box flexDirection="row" gap={2}>
        <Text bold>bold</Text>
        <Text italic>italic</Text>
        <Text underline>underline</Text>
        <Text dim>dim</Text>
        <Text bold italic color="green">bold+italic+color</Text>
        <Text bold underline color="yellow">bold+underline</Text>
      </Box>
    </Section>
  )
}

// ─── Background colors ────────────────────────────────────────────────────────

function BackgroundsSection() {
  return (
    <Section title="Backgrounds">
      <Box flexDirection="row" gap={1}>
        <Box backgroundColor="red" paddingX={1}><Text color="white">red</Text></Box>
        <Box backgroundColor="green" paddingX={1}><Text color="black">green</Text></Box>
        <Box backgroundColor="blue" paddingX={1}><Text color="white">blue</Text></Box>
        <Box backgroundColor="#c77dff" paddingX={1}><Text color="white">#c77dff</Text></Box>
        <Box backgroundColor="rgb(255,200,0)" paddingX={1}><Text color="black">rgb(255,200,0)</Text></Box>
      </Box>
    </Section>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function LayoutSection() {
  return (
    <Section title="Layout (Flexbox)">
      <Box flexDirection="row" gap={2}>
        {/* justify-content */}
        <Box flexDirection="column">
          <Text dim>justify-content</Text>
          {(['flex-start', 'center', 'flex-end', 'space-between'] as const).map(j => (
            <Box key={j} borderStyle="single" width={24} justifyContent={j}>
              <Text color="yellow">A</Text>
              <Text color="cyan">B</Text>
            </Box>
          ))}
        </Box>
        {/* Spacer demo */}
        <Box flexDirection="column">
          <Text dim>Spacer</Text>
          <Box borderStyle="single" width={20}>
            <Text color="green">left</Text>
            <Spacer />
            <Text color="red">right</Text>
          </Box>
          <Box borderStyle="single" width={20} flexDirection="column">
            <Text color="green">top</Text>
            <Spacer />
            <Text color="red">bottom</Text>
          </Box>
        </Box>
      </Box>
    </Section>
  )
}

// ─── Focus ────────────────────────────────────────────────────────────────────

function FocusableItem({ label, color }: { label: string; color: string }) {
  const { isFocused } = useFocus()
  return (
    <Box
      borderStyle={isFocused ? 'round' : 'single'}
      borderColor={isFocused ? color : 'gray'}
      paddingX={1}
    >
      <Text color={isFocused ? color : 'gray'} bold={isFocused}>
        {label}{isFocused ? ' ◀' : ''}
      </Text>
    </Box>
  )
}

function FocusSection() {
  const { activeId } = useFocusManager()
  return (
    <Section title="Focus (Tab / Shift+Tab to cycle)">
      <Box flexDirection="row" gap={1}>
        <FocusableItem label="Alpha" color="green" />
        <FocusableItem label="Beta" color="yellow" />
        <FocusableItem label="Gamma" color="magenta" />
        <FocusableItem label="Delta" color="cyan" />
      </Box>
      <Text dim>Active: {activeId ?? 'none'}</Text>
    </Section>
  )
}

// ─── Live stats ───────────────────────────────────────────────────────────────

function LiveSection({ frame }: { frame: number }) {
  const { columns, rows } = useWindowSize()
  const now = new Date()
  const time = now.toTimeString().split(' ')[0]

  return (
    <Section title="Live">
      <Box flexDirection="row" gap={4}>
        <Text>🕐 <Text color="green" bold>{time}</Text></Text>
        <Text>Frame <Text color="cyan" bold>{frame}</Text></Text>
        <Text>Terminal <Text color="yellow" bold>{columns}×{rows}</Text></Text>
      </Box>
    </Section>
  )
}

// ─── Status bar ───────────────────────────────────────────────────────────────

function StatusBar() {
  return (
    <Box borderStyle="round" borderColor="gray" paddingX={2}>
      <Text dim>Tab</Text><Text> cycle focus  </Text>
      <Text dim>Ctrl+C / Q</Text><Text> quit</Text>
    </Box>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

function KitchenSink() {
  const { exit } = useApp()
  const [frame, setFrame] = useState(0)

  // Tick once per second for the clock
  useEffect(() => {
    const t = setInterval(() => setFrame(f => f + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useInput((input, key) => {
    if (input === 'q' || input === 'Q') exit()
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">★ ratatat kitchen sink  </Text>
        <Text dim>— every feature in one place</Text>
      </Box>

      <BordersSection />
      <ColorsSection />
      <TextStylesSection />
      <BackgroundsSection />
      <LayoutSection />
      <FocusSection />
      <LiveSection frame={frame} />
      <StatusBar />
    </Box>
  )
}

render(<KitchenSink />)
