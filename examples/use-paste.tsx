/**
 * use-paste.tsx — usePaste hook demo
 *
 * Demonstrates Ink-compatible paste channel behavior:
 * - When paste handler is active, pasted text goes to usePaste()
 * - When paste handler is disabled, pasted text falls back to useInput()
 *
 * Controls:
 *   p         toggle paste handler active/inactive
 *   c         clear event log
 *   q / Esc   quit
 *
 * Run: node --import @oxc-node/core/register examples/use-paste.tsx
 */

import React, { useState } from 'react'
import { render, Box, Text, Static, useApp, useInput, usePaste } from '../dist/index.js'

type EventLine = { id: number; text: string }

function preview(text: string, max = 48) {
  const oneLine = text.replace(/\r\n?/g, '\\n').replace(/\n/g, '\\n')
  if (oneLine.length <= max) return oneLine
  return `${oneLine.slice(0, max)}…`
}

function App() {
  const { exit } = useApp()
  const [pasteActive, setPasteActive] = useState(true)
  const [events, setEvents] = useState<EventLine[]>([])

  const pushEvent = (text: string) => {
    setEvents((prev) => [...prev, { id: prev.length + 1, text }])
  }

  usePaste(
    (text) => {
      pushEvent(`[usePaste] len=${text.length} payload="${preview(text)}"`)
    },
    { isActive: pasteActive },
  )

  useInput((input, key) => {
    if (key.escape || input === 'q' || (key.ctrl && input === 'c')) {
      exit()
      return
    }

    if (input === 'p') {
      setPasteActive((v) => !v)
      return
    }

    if (input === 'c') {
      setEvents([])
      return
    }

    // useInput sees typed keys always; it only sees paste payload when usePaste
    // has no active listener (fallback behavior).
    if (input.length > 0) {
      pushEvent(`[useInput] len=${input.length} payload="${preview(input)}"`)
    }
  })

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        usePaste demo
      </Text>

      <Text>
        paste handler:{' '}
        <Text color={pasteActive ? 'green' : 'yellow'} bold>
          {pasteActive ? 'active' : 'inactive'}
        </Text>
      </Text>

      <Text dim>p toggle paste handler · c clear log · q/Esc quit · paste multiline text to test channel routing</Text>

      <Box borderStyle="round" borderColor="gray" paddingX={1} paddingY={1} flexDirection="column">
        <Text bold>Events</Text>
        <Static items={events}>
          {(item) => (
            <Text key={item.id} color="white">
              {item.text}
            </Text>
          )}
        </Static>
        {events.length === 0 && <Text dim>(no events yet)</Text>}
      </Box>
    </Box>
  )
}

render(<App />)
