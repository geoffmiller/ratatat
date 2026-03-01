// @ts-nocheck
import React from 'react';
import { RatatatApp } from './app.js';
import { InputParser } from './input.js';
import { LayoutNode } from './layout.js';
import { RatatatReconciler } from './reconciler.js';
import { renderTreeToBuffer } from './renderer.js';
import { RatatatContext } from './hooks.js';

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
}

export const Box: React.FC<BoxProps> = (props) => {
  return React.createElement('box', props, props.children);
};

export const Text: React.FC<TextProps> = (props) => {
  // Wrap simple strings inside a text layout node
  return React.createElement('text', props, props.children);
};

// Global mount utility
// Global mount utility
export function render(element: React.ReactElement) {
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
    element
  );

  RatatatReconciler.updateContainer(wrappedElement as any, container, null, () => {});

  // On every tick of the Game Loop, layout the Yoga tree and paint it
  app.on('render', (buffer, w, h) => {
    // Only calculate layout if tree is dirty, but for simplicity always calc
    rootNode.calculateLayout(w, h);
    renderTreeToBuffer(rootNode, buffer, w, h);
  });
  
  input.start();
  app.start();
  
  return {
    app,
    input
  };
}
