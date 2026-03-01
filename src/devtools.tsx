/**
 * DevTools — optional development overlay for ratatat apps.
 *
 * Wraps your app and renders a HUD in the bottom-right corner.
 * FPS is measured from actual render events (not a timer guess).
 *
 * Usage:
 *   import { DevTools } from 'ratatat'
 *
 *   render(
 *     <DevTools>
 *       <MyApp />
 *     </DevTools>
 *   )
 *
 * Props:
 *   enabled?   boolean   — show/hide without removing from tree (default: true)
 *
 * Future slots: render count, memory usage, custom metrics via props.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Box, Spacer, Text } from './react.js';
import { useRatatatContext, useWindowSize } from './hooks.js';

export interface DevToolsProps {
  children: React.ReactNode;
  /** Show/hide the HUD without unmounting (default: true) */
  enabled?: boolean;
}

/**
 * Measures actual render throughput by counting 'render' events on the app.
 * Returns FPS averaged over the last 500ms window.
 */
function useFpsCounter() {
  const { app } = useRatatatContext();
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const windowStart = useRef(Date.now());

  useEffect(() => {
    const onRender = () => {
      frames.current++;
      const now = Date.now();
      const elapsed = now - windowStart.current;
      if (elapsed >= 500) {
        setFps(Math.round((frames.current / elapsed) * 1000));
        frames.current = 0;
        windowStart.current = now;
      }
    };

    app.on('render', onRender);
    return () => { app.off('render', onRender); };
  }, [app]);

  return fps;
}

/** Small FPS badge — color-coded green/yellow/red */
function FpsHud({ fps }: { fps: number }) {
  const color = fps === 0 ? 'gray' : fps >= 55 ? 'green' : fps >= 30 ? 'yellow' : 'red';
  const label = fps === 0 ? ' -- ' : String(fps).padStart(3);
  return (
    <Box borderStyle="round" borderColor={color} paddingX={1}>
      <Text color={color} bold>{label}</Text>
      <Text color={color} dim> fps</Text>
    </Box>
  );
}

export function DevTools({ children, enabled = true }: DevToolsProps) {
  const fps = useFpsCounter();
  const { columns, rows } = useWindowSize();

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      {/* App content fills all available space */}
      <Box flexGrow={1}>
        {children}
      </Box>

      {/* HUD row — only takes space when enabled */}
      {enabled && (
        <Box flexDirection="row" flexShrink={0}>
          <Spacer />
          <FpsHud fps={fps} />
        </Box>
      )}
    </Box>
  );
}
