import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { RatatatApp } from './app.js';
import { InputParser } from './input.js';

export interface RatatatContextProps {
  app: RatatatApp;
  input: InputParser;
  writeStdout: (text: string) => void;
  writeStderr: (text: string) => void;
}

export const RatatatContext = createContext<RatatatContextProps | null>(null);

export interface Key {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  return: boolean;
  backspace: boolean;
  delete: boolean;
  tab: boolean;
  shift: boolean;
  escape: boolean;
  ctrl: boolean;
  meta: boolean;
}

export type InputHandler = (input: string, key: Key) => void;

/**
 * Subscribes to keyboard input. Uses a stable ref so the effect runs
 * exactly once (on mount) regardless of how often the component re-renders.
 * Always invokes the latest handler passed by the caller.
 */
export const useInput = (handler: InputHandler) => {
  const context = useContext(RatatatContext);

  if (!context) {
    throw new Error('useInput must be used within a Ratatat App environment');
  }

  // 1. Stable ref initialized with the first handler value
  const handlerRef = useRef<InputHandler>(handler);

  // 2. Sync ref on every render (no dep array) — always up to date
  useEffect(() => {
    handlerRef.current = handler;
  });

  // 3. Stable effect: subscribe once per context instance, use ref inside
  useEffect(() => {
    const handleKeydown = (keyName: string) => {
      const isUp = keyName === 'up';
      const isDown = keyName === 'down';
      const isLeft = keyName === 'left';
      const isRight = keyName === 'right';
      const isEnter = keyName === 'enter';
      const isBackspace = keyName === 'backspace';
      const isTab = keyName === 'tab';
      const isShiftTab = keyName === 'shift-tab';
      const isEscape = keyName === 'escape';

      handlerRef.current('', {
        upArrow: isUp,
        downArrow: isDown,
        leftArrow: isLeft,
        rightArrow: isRight,
        return: isEnter,
        backspace: isBackspace,
        delete: false,
        tab: isTab || isShiftTab,
        shift: isShiftTab,
        escape: isEscape,
        ctrl: false,
        meta: false,
      });
    };

    const handleData = (data: string) => {
      // Printable characters fall through to this listener
      // Ignore ANSI escape codes completely so it doesn't leak raw strings
      if (data.startsWith('\u001b')) return;
      // Ignore enter/carriage return as it's handled by keydown
      if (data === '\r' || data === '\n') return;
      // Ignore backspace payload (127) as it's processed previously if supported
      if (data === '\u007f') {
        handlerRef.current('', {
          upArrow: false,
          downArrow: false,
          leftArrow: false,
          rightArrow: false,
          return: false,
          backspace: true,
          delete: false,
          tab: false,
          shift: false,
          escape: false,
          ctrl: false,
          meta: false,
        });
        return;
      }

      handlerRef.current(data, {
        upArrow: false,
        downArrow: false,
        leftArrow: false,
        rightArrow: false,
        return: false,
        backspace: false,
        delete: false,
        tab: false,
        shift: false,
        escape: false,
        ctrl: false,
        meta: false,
      });
    };

    context.input.on('keydown', handleKeydown);
    context.input.on('data', handleData);

    return () => {
      context.input.off('keydown', handleKeydown);
      context.input.off('data', handleData);
    };
  }, [context]);
};

/**
 * Raw access to the RatatatContext — app instance + input parser.
 * Useful for advanced integrations (e.g. DevTools, custom hooks).
 */
export const useRatatatContext = () => {
  const context = useContext(RatatatContext);
  if (!context) throw new Error('useRatatatContext must be used within a Ratatat App environment');
  return context;
};

/**
 * Access app controls. Returns { exit } for Ink compatibility.
 * exit() triggers a clean shutdown (restores terminal, stops input, exits process).
 */
export const useApp = () => {
  const context = useContext(RatatatContext);

  if (!context) {
    throw new Error('useApp must be used within a Ratatat App environment');
  }

  return {
    // Ink-compatible: const { exit } = useApp()
    exit: () => context.app.quit(),
    // ratatat-native: direct app access
    quit: () => context.app.quit(),
  };
};

/**
 * Returns current terminal dimensions and re-renders on resize (SIGWINCH).
 * Ink-compatible: const { columns, rows } = useWindowSize()
 */
export const useWindowSize = () => {
  const context = useContext(RatatatContext);

  if (!context) {
    throw new Error('useWindowSize must be used within a Ratatat App environment');
  }

  const [size, setSize] = useState(() => context.app.getSize());

  useEffect(() => {
    const onResize = () => setSize(context.app.getSize());
    context.app.on('resize', onResize);
    return () => { context.app.off('resize', onResize); };
  }, [context]);

  return { columns: size.width, rows: size.height };
};

/**
 * In raw mode, \n moves the cursor down but does not return to column 0.
 * Must use \r\n to get a proper newline. Apply this to any text written
 * outside the TUI render path (useStdout/useStderr write calls).
 */
const toRawNewlines = (text: string) => text.replace(/\r?\n/g, '\r\n');

/**
 * Write to stdout without disturbing the TUI.
 * Ink-compatible: const { write, stdout } = useStdout()
 * Output is buffered while the alternate screen is active and flushed on exit.
 */
export const useStdout = () => {
  const context = useContext(RatatatContext);
  return {
    stdout: process.stdout,
    write: (text: string) => context ? context.writeStdout(text) : process.stdout.write(toRawNewlines(text)),
  };
};

/**
 * Write to stderr without disturbing the TUI.
 * Ink-compatible: const { write, stderr } = useStderr()
 * Output is buffered while the alternate screen is active and flushed on exit.
 */
export const useStderr = () => {
  const context = useContext(RatatatContext);
  return {
    stderr: process.stderr,
    write: (text: string) => context ? context.writeStderr(text) : process.stderr.write(toRawNewlines(text)),
  };
};

/**
 * Access raw stdin stream and raw mode controls.
 * Ink-compatible: const { stdin, setRawMode, isRawModeSupported } = useStdin()
 */
export const useStdin = () => {
  const isRawModeSupported = !!process.stdin.setRawMode;
  return {
    stdin: process.stdin,
    isRawModeSupported,
    setRawMode: (value: boolean) => {
      if (isRawModeSupported) {
        process.stdin.setRawMode(value);
      }
    },
  };
};
