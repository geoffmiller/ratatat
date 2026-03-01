import { createContext, useContext, useEffect } from 'react';
import { RatatatApp } from './app.js';
import { InputParser } from './input.js';

export interface RatatatContextProps {
  app: RatatatApp;
  input: InputParser;
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
}

export type InputHandler = (input: string, key: Key) => void;

/**
 * React hook that lets components listen to keyboard inputs easily,
 * tracking arrow keys, enter, backspace natively.
 */
export const useInput = (handler: InputHandler) => {
  const context = useContext(RatatatContext);

  if (!context) {
    throw new Error('useInput must be used within a Ratatat App environment');
  }

  useEffect(() => {
    const handleKeydown = (keyName: string) => {
      const isUp = keyName === 'up';
      const isDown = keyName === 'down';
      const isLeft = keyName === 'left';
      const isRight = keyName === 'right';
      const isEnter = keyName === 'enter';
      const isBackspace = keyName === 'backspace';

      handler('', {
        upArrow: isUp,
        downArrow: isDown,
        leftArrow: isLeft,
        rightArrow: isRight,
        return: isEnter,
        backspace: isBackspace,
        delete: false
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
          handler('', {
            upArrow: false, downArrow: false, leftArrow: false, rightArrow: false, return: false, backspace: true, delete: false
          });
          return;
       }

       handler(data, {
         upArrow: false,
         downArrow: false,
         leftArrow: false,
         rightArrow: false,
         return: false,
         backspace: false,
         delete: false
       });
    };

    context.input.on('keydown', handleKeydown);
    context.input.on('data', handleData);

    return () => {
      context.input.off('keydown', handleKeydown);
      context.input.off('data', handleData);
    };
  }, [context, handler]);
};

/**
 * Access the underlying Ratatat App instance to trigger manual exits
 */
export const useApp = () => {
  const context = useContext(RatatatContext);

  if (!context) {
    throw new Error('useApp must be used within a Ratatat App environment');
  }

  return context.app;
};
