// @ts-nocheck — reconciler createContainer arity varies between React versions
import React from 'react';
import { RatatatApp } from './app.js';
import { InputParser } from './input.js';
import { LayoutNode } from './layout.js';
import { RatatatReconciler, setOnAfterCommit } from './reconciler.js';
import { renderTreeToBuffer } from './renderer.js';
import { RatatatContext, useInput } from './hooks.js';
import { FocusProvider, useFocusManager } from './focus.js';

import { Styles } from './styles.js';

export interface BoxProps extends Styles {
  children?: React.ReactNode;
  bg?: number;
  fg?: number;
  styles?: number;
}

export interface TextProps extends Styles {
  children?: React.ReactNode;
  fg?: number;
  bg?: number;
  styles?: number;
  /** Ink compat alias for `dim` */
  dimColor?: boolean;
}

export const Box: React.FC<BoxProps> = (props) => {
  return React.createElement('box', props, props.children);
};

export const Text: React.FC<TextProps> = (props) => {
  // Wrap simple strings inside a text layout node
  return React.createElement('text', props, props.children);
};

/**
 * Renders a newline character — equivalent to a line break in the layout.
 * Ink-compatible: <Newline count={2} />
 */
export interface NewlineProps {
  count?: number;
}
export const Newline: React.FC<NewlineProps> = ({ count = 1 }) => {
  return React.createElement(Text, {}, '\n'.repeat(count));
};

/**
 * Flexible spacer that fills available space in the parent flex container.
 * Ink-compatible: <Spacer />
 */
export const Spacer: React.FC = () => {
  return React.createElement(Box, { flexGrow: 1 });
};

/**
 * Internal component that handles Tab/Shift+Tab for focus cycling.
 * Must live inside FocusProvider to access FocusContext.
 */
const TabHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { focusNext, focusPrevious, disableFocus, enableFocus } = useFocusManager();

  useInput((_input, key) => {
    if (key.tab && !key.shift) focusNext();
    if (key.tab && key.shift) focusPrevious();
    if (key.escape) { disableFocus(); enableFocus(); } // reset focus (Ink built-in)
  });

  return React.createElement(React.Fragment, null, children);
};

// Global mount utility
// Global mount utility
/** Ink-compat render options — accepted but mostly ignored (Ratatat is always event-driven + concurrent) */
export interface RenderOptions {
  /** Ignored — Ratatat is always concurrent */
  concurrent?: boolean;
  /** Ignored — Ratatat is always event-driven, no frame cap */
  maxFps?: number;
  /** Ignored — Ratatat always patches console */
  patchConsole?: boolean;
  /** Ignored — Ctrl+C always exits */
  exitOnCtrlC?: boolean;
  /** Ignored */
  incrementalRendering?: boolean;
  /** Ignored */
  debug?: boolean;
}

export function render(element: React.ReactElement, _options?: RenderOptions) {
  const app = new RatatatApp();
  const input = new InputParser(process.stdin);
  
  const rootNode = new LayoutNode();
  const { width, height } = app.getSize();
  
  rootNode.yogaNode.setWidth(width);
  rootNode.yogaNode.setHeight(height);

  // Hook Reconciler up to the root Yoga Node container
  const container = RatatatReconciler.createContainer(
    rootNode,
    0, // Legacy root
    null, // hydrate
    false,
    null,
    '', // prefix
    (error: Error) => console.error(error),
    null
  );

  const wrappedElement = React.createElement(
    RatatatContext.Provider,
    { value: { app, input } },
    React.createElement(
      FocusProvider,
      null,
      React.createElement(TabHandler, null, element)
    )
  );

  RatatatReconciler.updateContainer(wrappedElement as any, container, null, () => {});

  // On every render event: layout the Yoga tree and paint it to the buffer
  app.on('render', (buffer, w, h) => {
    rootNode.calculateLayout(w, h);
    renderTreeToBuffer(rootNode, buffer, w, h);
  });

  // Wire reconciler commits → requestRender (every React state update triggers a repaint)
  setOnAfterCommit(() => app.requestRender());

  // Ctrl+C: clean shutdown — restore terminal, stop stdin, exit
  input.on('exit', () => {
    app.stop();
    input.stop();
    process.exit(0);
  });

  // app.quit(): programmatic clean exit from useApp()
  app.on('quit', () => {
    app.stop();
    input.stop();
    process.exit(0);
  });

  input.start();
  app.start();

  // Handle terminal resize: update root node dimensions and re-layout
  const onSigwinch = () => {
    const { width, height } = app.getSize();
    rootNode.yogaNode.setWidth(width);
    rootNode.yogaNode.setHeight(height);
    app.emit('resize');
    app.requestRender();
  };
  process.on('SIGWINCH', onSigwinch);

  // Paint the initial frame (after start() sets isRunning = true)
  app.requestRender();
  
  return {
    app,
    input
  };
}
