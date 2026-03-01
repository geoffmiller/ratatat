# Ratatat

Ratatat is a React custom reconciler built for the terminal, focusing on high-performance layout and rendering using `napi-rs` and Yoga Flexbox.

## Features

- **React Reconciler**: Write your TUI using standard React components (`<Box>`, `<Text>`).
- **Flexbox Layout**: Powered by `yoga-layout-prebuilt` for robust and familiar layout algorithms.
- **High Performance**: Native Rust diffing engine with a zero-allocation 64-bit interleaved rendering buffer for 21-bit Unicode support.
- **Borders & Styling**: Beautiful box-drawn borders and full 256-color support.

## Running the Demo

To test the interactive React component demo in your own terminal, run the following commands:

```bash
# Ensure you are in the ratatat directory
cd ratatat

# Install dependencies if you haven't already
npm install

# Build the Rust native add-on and TypeScript files
npm run build
npm run build:ts

# Run the counter demo
npx -y tsx example-react.tsx
```

Once running, you can press the **Up** and **Down** arrow keys to increment and decrement the counter. Press `Ctrl+C` or `q` to exit.

## Development

- `npm run build`: Builds the Rust N-API node add-on.
- `npm run build:ts`: Compiles the TypeScript reconciler and examples.
- `npm run test`: Runs the test suite for the terminal renderer.
