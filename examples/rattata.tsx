/**
 * rattata.tsx — Rattata AI coding assistant (demo)
 *
 * A Ratatat-themed fake AI coding assistant TUI.
 * Auto-plays a scripted session. Press 'q' or Ctrl+C to exit.
 *
 * Run: node --import @oxc-node/core/register examples/rattata.tsx
 */
// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { render, Box, Text, Static, useInput, useApp, useWindowSize } from '../dist/index.js'

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageKind = 'user' | 'ai' | 'tool' | 'diff' | 'system'

interface Message {
  id: number
  kind: MessageKind
  text: string
  done: boolean
}

// ─── Script ───────────────────────────────────────────────────────────────────

const SCRIPT: Array<{ kind: MessageKind; text: string; delay: number }> = [
  {
    kind: 'system',
    text: 'Rattata v0.1.0  ·  model: rattata-large-2  ·  context: 128k',
    delay: 0,
  },
  {
    kind: 'user',
    text: 'the terminal renderer is flushing too slowly, can you take a look?',
    delay: 600,
  },
  {
    kind: 'tool',
    text: '▸ read_file  src/terminal.rs',
    delay: 900,
  },
  {
    kind: 'tool',
    text: '▸ search     "write_all\\|flush\\|BufWriter"  →  4 matches',
    delay: 400,
  },
  {
    kind: 'ai',
    text: "Found it. The renderer calls `stdout.write_all()` per-cell without a `BufWriter` — that's a syscall on every character. Wrapping stdout in a `BufWriter` will batch writes and flush once per frame. Should be a significant speedup.",
    delay: 500,
  },
  {
    kind: 'tool',
    text: '▸ edit_file  src/terminal.rs',
    delay: 400,
  },
  {
    kind: 'diff',
    text: [
      '  @@ src/terminal.rs:42 @@',
      '- pub fn write_output(stdout: &mut Stdout, s: &str) {',
      '-     stdout.write_all(s.as_bytes()).unwrap();',
      '+ pub fn write_output(stdout: &mut Stdout, s: &str) {',
      '+     let mut buf = BufWriter::new(stdout);',
      '+     buf.write_all(s.as_bytes()).unwrap();',
      '+     buf.flush().unwrap();',
      '  }',
    ].join('\n'),
    delay: 300,
  },
  {
    kind: 'ai',
    text: 'Done. Also noticed `lock()` was being called inside the loop — moved it outside so we only acquire the lock once per frame. That alone should cut ~30% of frame time on busy terminals.',
    delay: 400,
  },
  {
    kind: 'tool',
    text: '▸ run_tests  cargo test terminal  →  12 passed  (0.4s)',
    delay: 800,
  },
  {
    kind: 'ai',
    text: 'All green. Want me to run the stress-test benchmark to confirm the speedup?',
    delay: 300,
  },
  {
    kind: 'user',
    text: 'yes please',
    delay: 1200,
  },
  {
    kind: 'tool',
    text: '▸ run_bench  examples/stress-test.tsx',
    delay: 600,
  },
  {
    kind: 'tool',
    text: '▸ result     before: 187 fps  →  after: 312 fps  (+67%)',
    delay: 1400,
  },
  {
    kind: 'ai',
    text: 'Nice — 67% throughput improvement. The BufWriter change accounts for most of it. Commit message suggestion:\n\nperf: wrap stdout in BufWriter, hoist lock() out of render loop\n\nSaves ~1 syscall per cell and ~1 mutex acquisition per frame.',
    delay: 200,
  },
]

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useSpinner() {
  const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 80)
    return () => clearInterval(t)
  }, [])
  return FRAMES[frame]
}

function useTokens() {
  const [tokens, setTokens] = useState(1247)
  useEffect(() => {
    const t = setInterval(() => {
      setTokens((n) => n + Math.floor(Math.random() * 8 + 1))
    }, 120)
    return () => clearInterval(t)
  }, [])
  return tokens
}

function useClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }))
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }))
    }, 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

// ─── Components ───────────────────────────────────────────────────────────────

function Header({ tokens, time }: { tokens: number; time: string }) {
  return (
    <Box borderStyle="single" borderColor="cyan" paddingX={1} flexDirection="row" justifyContent="space-between">
      <Box flexDirection="row" gap={1}>
        <Text color="cyan" bold>
          RATTATA
        </Text>
        <Text color="blackBright">│</Text>
        <Text color="magenta">rattata-large-2</Text>
        <Text color="blackBright">│</Text>
        <Text color="yellow">⬡ rust</Text>
      </Box>
      <Box flexDirection="row" gap={2}>
        <Text color="blackBright">{tokens.toLocaleString()} tok</Text>
        <Text color="blackBright">{time}</Text>
        <Text color="blackBright">[q] quit</Text>
      </Box>
    </Box>
  )
}

const FILE_TREE = [
  { name: 'src/', indent: 0, dir: true },
  { name: 'lib.rs', indent: 1, active: false },
  { name: 'terminal.rs', indent: 1, active: true },
  { name: 'ansi.rs', indent: 1, active: false },
  { name: 'cell.ts', indent: 1, active: false },
  { name: 'renderer.ts', indent: 1, active: false },
  { name: 'layout.ts', indent: 1, active: false },
  { name: 'hooks.ts', indent: 1, active: false },
  { name: 'react.ts', indent: 1, active: false },
  { name: 'examples/', indent: 0, dir: true },
  { name: 'stress-test.tsx', indent: 1, active: false },
  { name: 'rattata.tsx', indent: 1, active: false },
]

function Sidebar({ width }: { width: number }) {
  return (
    <Box width={width} flexDirection="column" borderStyle="single" borderColor="blackBright">
      <Box paddingX={1}>
        <Text color="blackBright" bold>
          FILES
        </Text>
      </Box>
      {FILE_TREE.map((f, i) => (
        <Box key={i} paddingLeft={1 + f.indent * 2}>
          {f.dir ? (
            <Text color="blueBright">▸ {f.name}</Text>
          ) : f.active ? (
            <Text color="cyan" bold>
              ● {f.name}
            </Text>
          ) : (
            <Text color="blackBright"> {f.name}</Text>
          )}
        </Box>
      ))}
    </Box>
  )
}

function DiffBlock({ text }: { text: string }) {
  return (
    <Box flexDirection="column" marginY={0}>
      {text.split('\n').map((line, i) => {
        const color = line.startsWith('+')
          ? 'greenBright'
          : line.startsWith('-')
            ? 'red'
            : line.startsWith('@')
              ? 'cyan'
              : 'blackBright'
        return (
          <Box key={i} paddingLeft={4}>
            <Text color={color}>{line}</Text>
          </Box>
        )
      })}
    </Box>
  )
}

function MessageBlock({ msg }: { msg: Message }) {
  if (msg.kind === 'system') {
    return (
      <Box paddingX={2} paddingY={0}>
        <Text color="blackBright" italic>
          {msg.text}
        </Text>
      </Box>
    )
  }

  if (msg.kind === 'user') {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Box paddingX={2}>
          <Text color="yellow" bold>
            you{' '}
          </Text>
          <Text color="blackBright">{msg.text}</Text>
        </Box>
      </Box>
    )
  }

  if (msg.kind === 'tool') {
    return (
      <Box paddingLeft={4}>
        <Text color="magenta">{msg.text}</Text>
      </Box>
    )
  }

  if (msg.kind === 'diff') {
    return <DiffBlock text={msg.text} />
  }

  // ai
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box paddingX={2}>
        <Text color="cyan" bold>
          rat{' '}
        </Text>
        <Box flexGrow={1} flexDirection="column">
          {msg.text.split('\n').map((line, i) => (
            <Text key={i} color="white">
              {line}
            </Text>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

function StatusBar({ thinking, spinner, done }: { thinking: boolean; spinner: string; done: boolean }) {
  return (
    <Box borderStyle="single" borderColor="blackBright" paddingX={1} flexDirection="row" justifyContent="space-between">
      <Box flexDirection="row" gap={1}>
        {done ? (
          <Text color="greenBright">✓ session complete</Text>
        ) : thinking ? (
          <>
            <Text color="cyan">{spinner}</Text>
            <Text color="cyan">thinking…</Text>
          </>
        ) : (
          <Text color="blackBright">ready</Text>
        )}
      </Box>
      <Text color="blackBright">ratatat v0.1.0</Text>
    </Box>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

let _id = 0
const uid = () => ++_id

function RattataApp() {
  const { exit } = useApp()
  const { columns, rows } = useWindowSize()
  const spinner = useSpinner()
  const tokens = useTokens()
  const time = useClock()

  const [settled, setSettled] = useState<Message[]>([]) // Static — never changes
  const [active, setActive] = useState<Message | null>(null) // currently streaming
  const [thinking, setThinking] = useState(false)
  const [done, setDone] = useState(false)

  const scriptIdx = useRef(0)
  const charIdx = useRef(0)
  const streamTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useInput((_input, key) => {
    if (key.escape) exit()
  })

  const advanceScript = useCallback(() => {
    const step = SCRIPT[scriptIdx.current]
    if (!step) {
      setDone(true)
      return
    }
    scriptIdx.current++

    // Instant messages (system, tool, diff) — commit immediately, then schedule next
    if (step.kind === 'system' || step.kind === 'tool' || step.kind === 'diff') {
      setSettled((s) => [...s, { id: uid(), kind: step.kind, text: step.text, done: true }])
      setThinking(step.kind === 'tool')
      stepTimer.current = setTimeout(advanceScript, SCRIPT[scriptIdx.current]?.delay ?? 0)
      return
    }

    // Streaming messages (user, ai) — reveal one char at a time
    charIdx.current = 0
    const msg: Message = { id: uid(), kind: step.kind, text: '', done: false }
    setActive(msg)
    setThinking(false)
    const speed = step.kind === 'user' ? 25 : 18
    const tick = () => {
      streamTimer.current = setTimeout(() => {
        setActive((cur) => {
          if (!cur) return cur
          charIdx.current++
          const next = step.text.slice(0, charIdx.current)
          if (charIdx.current >= step.text.length) {
            setSettled((s) => [...s, { id: cur.id, kind: cur.kind, text: step.text, done: true }])
            setActive(null)
            setThinking(false)
            stepTimer.current = setTimeout(advanceScript, SCRIPT[scriptIdx.current]?.delay ?? 0)
            return null
          }
          tick()
          return { ...cur, text: next }
        })
      }, speed)
    }
    tick()
  }, [])

  useEffect(() => {
    // Kick off after a short pause
    stepTimer.current = setTimeout(advanceScript, 400)
    return () => {
      if (streamTimer.current) clearTimeout(streamTimer.current)
      if (stepTimer.current) clearTimeout(stepTimer.current)
    }
  }, [])

  const sidebarW = 22
  const mainW = columns - sidebarW - 2 // borders

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Header tokens={tokens} time={time} />
      <Box flexGrow={1} flexDirection="row">
        <Sidebar width={sidebarW} />
        <Box flexGrow={1} flexDirection="column" borderStyle="single" borderColor="blackBright" paddingX={1}>
          {/* Committed messages — Static never re-renders old items */}
          <Static items={settled}>{(msg) => <MessageBlock key={msg.id} msg={msg} />}</Static>
          {/* Currently streaming message */}
          {active && <MessageBlock msg={active} />}
          {/* Thinking indicator between messages */}
          {thinking && !active && (
            <Box paddingLeft={4} marginTop={1}>
              <Text color="magenta">{spinner} </Text>
              <Text color="blackBright">running…</Text>
            </Box>
          )}
        </Box>
      </Box>
      <StatusBar thinking={thinking && !active} spinner={spinner} done={done} />
    </Box>
  )
}

render(<RattataApp />)
