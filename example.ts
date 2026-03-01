import { RatatatApp, InputParser, Cell } from './dist/index.js';

// Setup Application
const app = new RatatatApp();
const input = new InputParser(process.stdin);

let cursorX = 10;
let cursorY = 10;

// Setup Rendering Loop Payload
app.on('render', (buffer: Uint32Array, width: number, height: number) => {
  // Clear buffer (Fill with spaces and transparent/black BG)
  // For production this is done natively, but for MVP JS clear is fine
  const spaceCell = Cell.pack(' ', 255, 0, 0); 
  buffer.fill(spaceCell);

  // Draw a bouncing box in the middle to prove 60fps renders are smooth
  const msg = "Hello from Ratatat Rust Native Engine!";
  for(let i=0; i<msg.length; i++) {
    // Write characters. BG=2 (green), FG=15(white), Style=1(Bold)
    buffer[2 * width + 5 + i] = Cell.pack(msg[i], 15, 2, 1);
  }

  // Draw the mouse cursor
  const cursorCell = Cell.pack('X', 1, 255, 1); // Red X, Bold
  if (cursorX >= 0 && cursorX < width && cursorY >= 0 && cursorY < height) {
    buffer[cursorY * width + cursorX] = cursorCell;
  }
});

// Setup Input Triggers
input.on('exit', () => {
    input.stop();
    app.stop();
    process.exit(0);
});

input.on('click', (ev) => {
  cursorX = ev.x;
  cursorY = ev.y;
  app.requestRender();
});

input.on('keydown', (key) => {
  if (key === 'up') cursorY--;
  if (key === 'down') cursorY++;
  if (key === 'left') cursorX--;
  if (key === 'right') cursorX++;
  app.requestRender();
});

// Start the engine
input.start();
app.start();

console.log("Ratatat Started! Move around with arrows or click the mouse. Ctrl+C to exit.");
