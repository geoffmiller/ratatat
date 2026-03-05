// @ts-nocheck — reconciler createContainer arity varies between React versions
import React from 'react'
import { RatatatApp } from './app.js'
import { InputParser } from './input.js'
import { LayoutNode } from './layout.js'
import { RatatatReconciler, setOnAfterCommit } from './reconciler.js'
import { renderTreeToBuffer } from './renderer.js'
import { RatatatContext, useInput } from './hooks.js'
import { FocusProvider, useFocusManager } from './focus.js'

import { Styles } from './styles.js'

export interface BoxProps extends Styles {
  children?: React.ReactNode
  bg?: number
  fg?: number
  styles?: number
}

export interface TextProps extends Styles {
  children?: React.ReactNode
  fg?: number
  bg?: number
  styles?: number
  /** Ink compat alias for `dim` */
  dimColor?: boolean
}

export const Box: React.FC<BoxProps> = (props) => {
  return React.createElement('box', props, props.children)
}

export const Text: React.FC<TextProps> = (props) => {
  // Wrap simple strings inside a text layout node
  return React.createElement('text', props, props.children)
}

/**
 * Renders a newline character — equivalent to a line break in the layout.
 * Ink-compatible: <Newline count={2} />
 */
export interface NewlineProps {
  count?: number
}
export const Newline: React.FC<NewlineProps> = ({ count = 1 }) => {
  return React.createElement(Text, {}, '\n'.repeat(count))
}

/**
 * Flexible spacer that fills available space in the parent flex container.
 * Ink-compatible: <Spacer />
 */
export const Spacer: React.FC = () => {
  return React.createElement(Box, { flexGrow: 1 })
}

/**
 * Applies a string transformation to its children's text content.
 * The transform function receives the concatenated text of all children
 * and must return the transformed string.
 * Ink-compatible: <Transform transform={s => s.toUpperCase()}>{children}</Transform>
 */
export interface TransformProps {
  transform: (s: string, index: number) => string
  children?: React.ReactNode
}
export const Transform: React.FC<TransformProps> = ({ transform, children }) => {
  if (children === undefined || children === null) return null
  return React.createElement('box', { transform, flexShrink: 1 }, children)
}

/**
 * Internal component that handles Tab/Shift+Tab for focus cycling.
 * Must live inside FocusProvider to access FocusContext.
 */
const TabHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { focusNext, focusPrevious, disableFocus, enableFocus } = useFocusManager()

  useInput((_input, key) => {
    if (key.tab && !key.shift) focusNext()
    if (key.tab && key.shift) focusPrevious()
    if (key.escape) {
      disableFocus()
      enableFocus()
    } // reset focus (Ink built-in)
  })

  return React.createElement(React.Fragment, null, children)
}

// Global mount utility
/** Ink-compat render options */
export interface RenderOptions {
  /** Ignored — Ratatat is always concurrent */
  concurrent?: boolean
  /** Target frames per second for the render loop. Default: 60 */
  maxFps?: number
  /** Ignored — Ratatat always patches console */
  patchConsole?: boolean
  /** Ignored — Ctrl+C always exits */
  exitOnCtrlC?: boolean
  /** Ignored */
  incrementalRendering?: boolean
  /** Ignored */
  debug?: boolean
}

/** Return value of render() — Ink-compatible instance handle */
export interface Instance {
  rerender: (element: React.ReactElement) => void
  unmount: () => void
  waitUntilExit: () => Promise<void>
  /** ratatat-internal: direct app access */
  app: RatatatApp
  /** ratatat-internal: input parser */
  input: InputParser
}

export function render(element: React.ReactElement, options?: RenderOptions): Instance {
  const app = new RatatatApp()
  const input = new InputParser(process.stdin)

  const rootNode = new LayoutNode()
  const { width, height } = app.getSize()

  rootNode.yogaNode.setWidth(width)
  rootNode.yogaNode.setHeight(height)

  // Hook Reconciler up to the root Yoga Node container
  const container = RatatatReconciler.createContainer(
    rootNode,
    0, // Legacy root
    null, // hydrate
    false,
    null,
    '', // prefix
    (error: Error) => console.error(error),
    null,
  )

  // Wrap element — reused on rerender()
  const wrap = (el: React.ReactElement) =>
    React.createElement(
      RatatatContext.Provider,
      {
        value: {
          app,
          input,
          writeStdout: (t: string) => app.writeStdout(t),
          writeStderr: (t: string) => app.writeStderr(t),
        },
      },
      React.createElement(FocusProvider, null, React.createElement(TabHandler, null, el)),
    )

  RatatatReconciler.updateContainer(wrap(element) as any, container, null, () => {})

  // Paint function: layout + render to buffer + Rust diff/write
  const calcLayout = (w: number, h: number) => rootNode.calculateLayout(w, h)
  const renderBuf = (buf: Uint32Array, w: number, h: number) => renderTreeToBuffer(rootNode, buf, w, h)
  const paintNow = () => app.paintNow(calcLayout, renderBuf)

  // Dirty flag: set on every React commit, cleared by the render loop.
  // Decouples painting from React's scheduler — no dependency on resetAfterCommit
  // firing reliably for timer-driven updates (setTimeout, setInterval, streaming).
  let pendingCommit = false
  setOnAfterCommit(() => {
    pendingCommit = true
  })

  // Render loop: polls at maxFps and paints whenever React has committed new state.
  // setInterval keeps the Node.js event loop alive so the React scheduler can
  // deliver timer-driven updates between user input events.
  const frameMs = Math.round(1000 / (options?.maxFps ?? 60))
  const renderLoop = setInterval(() => {
    if (pendingCommit) {
      pendingCommit = false
      paintNow()
    }
  }, frameMs)

  // exitPromise: resolves when unmount() is called
  let resolveExit!: () => void
  const exitPromise = new Promise<void>((resolve) => {
    resolveExit = resolve
  })

  const cleanup = () => {
    clearInterval(renderLoop)
    app.stop()
    input.stop()
    process.off('SIGWINCH', onSigwinch)
    resolveExit()
  }

  // Ctrl+C: clean shutdown — restore terminal, stop stdin, exit
  input.on('exit', () => {
    cleanup()
    process.exit(0)
  })

  // app.quit(): programmatic clean exit from useApp()
  app.on('quit', () => {
    cleanup()
    process.exit(0)
  })

  input.start()
  app.start()

  // Handle terminal resize: update root node dimensions and repaint immediately
  const onSigwinch = () => {
    const width = process.stdout.columns || 80
    const height = process.stdout.rows || 24
    app.resize(width, height)
    rootNode.yogaNode.setWidth(width)
    rootNode.yogaNode.setHeight(height)
    app.emit('resize')
    paintNow()
  }
  process.on('SIGWINCH', onSigwinch)

  // Paint the initial frame (after start() sets isRunning = true)
  paintNow()

  return {
    /** Re-render with a new root element */
    rerender(newElement: React.ReactElement) {
      RatatatReconciler.updateContainer(wrap(newElement) as any, container, null, () => {})
    },
    /** Unmount the app and restore the terminal */
    unmount() {
      cleanup()
    },
    /** Resolves when unmount() is called or the app exits */
    waitUntilExit() {
      return exitPromise
    },
    // Internal access — not part of Ink's public API but useful for ratatat-native code
    app,
    input,
  }
}
