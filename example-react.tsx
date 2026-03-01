// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Box, Text, render, useInput, useApp } from './dist/index.js';

// React 18 Scheduler Polyfills for Node
if (typeof global !== 'undefined' && !global.document) {
    global.document = {
        createElement: () => ({}),
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    global.window = global;
    global.navigator = { scheduling: { isInputPending: () => false } };
}

const App = () => {
    const [counter, setCounter] = useState(0);

    const app = useApp();

    useInput((char, key) => {
        if (key.upArrow) setCounter(c => c + 1);
        if (key.downArrow) setCounter(c => c - 1);
        
        if (char === '\u0003' || char === 'q') {
             app.stop();
             process.exit(0);
        }
    });

    // Set App bg to Red
    return (
        <Box flexDirection="column" justifyContent="center" alignItems="center" bg={1} width="100%" height="100%">
            <Box bg={255} width={40} height={10} borderStyle="round" borderColor={2} flexDirection="column" justifyContent="space-between" padding={1}>
                <Text fg={0} bg={255} styles={2}>RATATAT REACT RENDERER</Text>
                
                <Box borderStyle="single" borderColor={9} paddingX={1} marginBottom={1}>
                   <Text fg={0} bg={255}>Counter: {counter}</Text>
                </Box>
                
                <Text fg={0} bg={255}>[PRESS ARROWS TO COUNT]</Text>
            </Box>
        </Box>
    );
};

render(<App />);
