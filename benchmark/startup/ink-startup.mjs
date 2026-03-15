import React, { useEffect } from 'react'
import { render, Text, useApp } from 'ink'

const MARKER = 'INK_STARTUP_READY'

function App() {
  const { exit } = useApp()

  useEffect(() => {
    // Exit one tick after first commit so startup reflects initial paint path.
    const timer = setTimeout(() => exit(), 0)
    return () => clearTimeout(timer)
  }, [exit])

  return React.createElement(Text, null, MARKER)
}

const instance = render(React.createElement(App), {
  exitOnCtrlC: false,
})

await instance.waitUntilExit()
