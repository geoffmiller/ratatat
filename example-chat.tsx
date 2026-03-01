// @ts-nocheck
import React, { useState } from 'react';
import { Box, Text, render, useInput, useApp } from './dist/index.js';

// React 18 Scheduler Polyfills for Node
if (typeof global !== 'undefined' && !global.document) {
    global.document = {
        createElement: () => ({}),
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    global.window = global as any;
    Object.defineProperty(global, 'navigator', {
        value: { scheduling: { isInputPending: () => false } },
        writable: true, configurable: true
    });
}

let messageId = 0;

function ChatApp() {
	const [input, setInput] = useState('');
	const app = useApp();

	const [messages, setMessages] = useState<
		Array<{
			id: number;
			text: string;
		}>
	>([]);

	useInput((character, key) => {
		if (key.return) {
			if (input) {
				setMessages(previousMessages => [
					...previousMessages,
					{
						id: messageId++,
						text: `User: ${input}`,
					},
				]);
				setInput('');
			}
		} else if (key.backspace || key.delete) {
			setInput(currentInput => currentInput.slice(0, -1));
		} else if (character === '\u0003') {
           // Ctrl+C
           app.stop();
           process.exit(0);
        } else {
			setInput(currentInput => currentInput + character);
		}
	});

	return (
		<Box flexDirection="column" padding={1} width={80} height={24} borderStyle="round" borderColor={2}>
            <Box flexDirection="column" height={20} borderStyle="single" borderColor={4} padding={1}>
				{messages.map(message => (
					<Text fg={255} bg={0} key={message.id}>{message.text}</Text>
				))}
			</Box>

			<Box marginTop={1}>
				<Text fg={3}>Enter your message: {input}█</Text>
			</Box>
		</Box>
	);
}

render(<ChatApp />);
