# Quickstart: React Mode

Build a TUI app using React components, hooks, and Yoga Flexbox layout.

## Minimal example

```tsx
import { render, Box, Text, useInput } from 'ratatat'
import React, { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  useInput((input, key) => {
    if (key.upArrow) setCount((c) => c + 1)
    if (key.downArrow) setCount((c) => c - 1)
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Counter
      </Text>
      <Text>
        Count: <Text color="green">{count}</Text>
      </Text>
      <Text dim>↑↓ to change · Ctrl+C to exit</Text>
    </Box>
  )
}

render(<Counter />)
```

Run it:

```bash
node --import @oxc-node/core/register app.tsx
```

---

## How it works

1. `render(<App />)` mounts your React tree into a virtual Yoga layout
2. Every state change triggers a React commit → dirty flag is set
3. The render loop (~60fps) picks up the dirty flag, runs layout, paints cells into a `Uint32Array`, and diffs against the previous frame
4. Only changed cells are written to stdout as ANSI escape sequences

---

## Layout: Box and flexbox

`Box` is the layout primitive. It maps directly to Yoga flexbox — the same props used in React Native.

```tsx
<Box flexDirection="row" gap={2} padding={1}>
  <Box flexDirection="column" flexGrow={1} borderStyle="round">
    <Text>Left panel</Text>
  </Box>
  <Box flexDirection="column" width={30} borderStyle="single">
    <Text>Right panel</Text>
  </Box>
</Box>
```

Common layout props: `flexDirection`, `flexGrow`, `flexShrink`, `flexBasis`, `width`, `height`, `minWidth`, `minHeight`, `padding`, `paddingX`, `paddingY`, `margin`, `gap`, `alignItems`, `justifyContent`, `borderStyle`.

---

## Text styling

```tsx
<Text color="cyan" bold>Bold cyan text</Text>
<Text color="#ff6600">Hex color</Text>
<Text backgroundColor="blue" color="white">Highlighted</Text>
<Text italic dim>Dim italic</Text>
```

Color accepts: named colors (`red`, `green`, `cyan`, etc.), hex strings (`#rrggbb`), rgb strings (`rgb(r,g,b)`), and xterm 256-color indices (0–255).

---

## Keyboard input

```tsx
import { useInput } from 'ratatat'

useInput((input, key) => {
  // input: the printable character (or '' for special keys)
  // key:   flags for what was pressed

  if (key.upArrow) {
    /* ↑ */
  }
  if (key.downArrow) {
    /* ↓ */
  }
  if (key.leftArrow) {
    /* ← */
  }
  if (key.rightArrow) {
    /* → */
  }
  if (key.return) {
    /* Enter */
  }
  if (key.escape) {
    /* Esc */
  }
  if (key.ctrl && input === 'c') {
    /* Ctrl+C */
  }
  if (key.tab) {
    /* Tab */
  }
})
```

See [Hooks: useInput](hooks.md#useinput) for the full key reference.

---

## App lifecycle

```tsx
import { useApp } from 'ratatat'

function App() {
  const { exit } = useApp()

  useInput((input, key) => {
    if (key.escape) exit()
  })

  return <Text>Press Esc to quit</Text>
}
```

`Ctrl+C` always exits cleanly — no extra setup needed.

---

## Render options

```tsx
render(<App />, {
  maxFps: 30, // cap frame rate (default: 60)
})
```

---

## Return value

```tsx
const { rerender, unmount, waitUntilExit } = render(<App />)

// Swap the root element
rerender(<App version={2} />)

// Tear down and restore the terminal
unmount()

// Await programmatic exit
await waitUntilExit()
```

---

## Testing with renderToString

For unit tests, render without a real terminal:

```tsx
import { renderToString, Box, Text } from 'ratatat'
import React from 'react'

const output = renderToString(
  <Box>
    <Text color="green">hello</Text>
  </Box>,
)
// output: 'hello'   (ANSI codes stripped — plain text)
```

---

## Next steps

- [Components](components.md) — full component reference
- [Hooks](hooks.md) — input, paste, mouse, focus, scroll
- [Examples](examples.md) — runnable demos
