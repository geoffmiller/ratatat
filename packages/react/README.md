# @ratatat/react

React adapter for Ratatat with an Ink-compatible API.

This package contains:

- `render()` and React host components (`Box`, `Text`, `Static`, etc.)
- hooks (`useInput`, `useFocus`, `useScrollable`, `useWindowSize`, ...)
- render-to-string support
- Yoga layout + reconciler integration

## Install

```bash
npm install @ratatat/react
```

`@ratatat/react` depends on `@ratatat/core` and uses its native renderer.

## Usage

```tsx
import React from 'react'
import { render, Text } from '@ratatat/react'

render(<Text>Hello from Ratatat</Text>)
```

For low-level runtime APIs, see [`@ratatat/core`](../core/README.md).
