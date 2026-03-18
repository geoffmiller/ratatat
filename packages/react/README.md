# @ratatat/react

React renderer for Ratatat with an Ink-compatible API.

Built on top of [`@ratatat/core`](../core/README.md), this package provides components, hooks, layout, and render lifecycle APIs for terminal UIs.

## Install

```bash
npm install @ratatat/react react
```

## Quick start

```tsx
import React from 'react'
import { render, Box, Text, useInput } from '@ratatat/react'

function App() {
  useInput((input, key) => {
    if (key.ctrl && input === 'c') process.exit(0)
  })

  return (
    <Box padding={1}>
      <Text color="cyan">Hello from @ratatat/react</Text>
    </Box>
  )
}

render(<App />)
```

## Main exports

- Rendering: `render`, `renderInline`, `renderToString`
- Components: `Box`, `Text`, `Static`, `Transform`, `Spinner`, `ProgressBar`, `Newline`, `Spacer`
- Hooks: `useInput`, `useApp`, `usePaste`, `useMouse`, `useFocus`, `useFocusManager`, `useScrollable`, `useTextInput`, `useWindowSize`, `useStdout`, `useStderr`

## Docs

- [Quickstart: React mode](../docs/quickstart-react.md)
- [Components reference](../docs/components.md)
- [Hooks reference](../docs/hooks.md)
- [Ink compatibility matrix](../docs/ink-compat.md)
- [Examples catalog](../docs/examples.md)

For low-level non-React rendering, use [`@ratatat/core`](../core/README.md).
