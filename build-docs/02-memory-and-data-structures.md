# Ratatat: Memory & Data Structures Protocol

## Overview

The heart of Ratatat's performance is strictly controlled memory layouts. To avoid V8 Garbage Collection, strings and objects are banned in the rendering hot path. The entire screen is represented by a `Uint32Array`.

## The Back Buffer

The JS side maintains a `Uint32Array` of size `columns * rows`.
The index for any `(x, y)` coordinate is: `index = y * columns + x`.

## The 32-Bit Cell Definition

Every cell on the terminal screen is encoded into exactly one 32-bit integer (4 bytes).

### Bit Layout (Little-Endian)

```
[31 .. 24] | [23 .. 16] | [15 ..  8] | [ 7 ..  0]
   STYLES  |  BG COLOR  |  FG COLOR  | ASCII CHAR
```

### 1. ASCII Char (Bits 0-7)

The character to display. Limited to ASCII/Extended ASCII (0-255) for phase 1. Complex Unicode/Emojis might require a separate out-of-band lookup table if they don't fit in 8 bits, or a switch to a custom 64-bit structure later. For the MVP, assume 8-bit characters.

### 2. Foreground Color (Bits 8-15)

The ANSI 256-color table code.

- `0-7`: Standard Colors
- `8-15`: High-Intensity Colors
- `16-231`: 6x6x6 RGB cube
- `232-255`: Grayscale
- _Special:_ `255` could be reserved for "transparent/default".

### 3. Background Color (Bits 16-23)

Same 256-color table mapping as Foreground Color.

### 4. Styles (Bits 24-31)

Bitmask for terminal styles.

- `Bit 24 (1)`: Bold
- `Bit 25 (2)`: Dim
- `Bit 26 (4)`: Italic
- `Bit 27 (8)`: Underline
- `Bit 28 (16)`: Blink
- `Bit 29 (32)`: Invert (Reverses FG and BG)
- `Bit 30 (64)`: Hidden
- `Bit 31 (128)`: Strikethrough

## TypeScript Bitwise Operations

Sub-agents must strictly adhere to these bitwise operations for performance. No objects like `{ char: 'A', fg: 'red' }` should ever be used inside the reconciler's write loop.

```typescript
export const Cell = {
  pack(char: string, fg: number, bg: number, styles: number): number {
    return (
      (char.charCodeAt(0) & 0xff) |
      ((fg & 0xff) << 8) |
      ((bg & 0xff) << 16) |
      ((styles & 0xff) << 24)
    );
  },

  getChar(cell: number): string {
    return String.fromCharCode(cell & 0xff);
  },

  getFg(cell: number): number {
    return (cell >> 8) & 0xff;
  },

  getBg(cell: number): number {
    return (cell >> 16) & 0xff;
  },

  getStyles(cell: number): number {
    return (cell >> 24) & 0xff;
  },
};
```

## Buffer Synchronization (The N-API Bridge)

When the React Reconciler finishes a frame, it passes the memory pointer to Rust.

```typescript
// JS Side
const buffer = new Uint32Array(width * height);
// ... write to buffer ...
NativeRenderer.render(buffer.buffer); // Pass the raw ArrayBuffer pointer
```

In Rust, the buffer is reinterpreted as a slice of `u32` integers and diffed against the previous frame slice.
