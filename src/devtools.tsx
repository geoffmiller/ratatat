/**
 * DevTools — optional development overlay for ratatat apps.
 *
 * Wraps your app and renders a HUD in the bottom-right corner.
 * Render rate is measured from actual render events (not a timer guess).
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

/** Small updates/sec badge */
function FpsHud({ fps }: { fps: number }) {
  const label = fps === 0 ? '--' : String(fps);
  return (
    <Box borderStyle="round" borderColor="gray" paddingX={1}>
      <Text dim>{label} updates/sec</Text>
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
