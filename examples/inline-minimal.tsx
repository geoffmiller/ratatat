/**
 * Minimal renderInline test — exits after 1 second, preserve mode.
 * If scrollback is wiped after this exits, the bug is structural in renderInline.
 */
import React from 'react'
import { Box, Text, renderInline } from '../src/react.js'
import { useApp } from '../src/hooks.js'

function App() {
  const { quit } = useApp()
  React.useEffect(() => {
    const t = setTimeout(() => quit(), 1000)
    return () => clearTimeout(t)
  }, [])
  return (
    <Box>
      <Text fg={51}>hello from renderInline</Text>
    </Box>
  )
}

renderInline(<App />, { rows: 3, onExit: 'preserve' })
