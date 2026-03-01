/**
 * Bit Layout (Little-Endian)
 * [31 .. 24] | [23 .. 16] | [15 ..  8] | [ 7 ..  0]
 *    STYLES  |  BG COLOR  |  FG COLOR  | ASCII CHAR
 */
export const Cell = {
  pack(char: string, fg: number = 255, bg: number = 255, styles: number = 0): number {
    return (char.charCodeAt(0) & 0xff) | ((fg & 0xff) << 8) | ((bg & 0xff) << 16) | ((styles & 0xff) << 24)
  },

  getChar(cell: number): string {
    return String.fromCharCode(cell & 0xff)
  },

  getFg(cell: number): number {
    return (cell >> 8) & 0xff
  },

  getBg(cell: number): number {
    return (cell >> 16) & 0xff
  },

  getStyles(cell: number): number {
    return (cell >> 24) & 0xff
  },
}

export const StyleMasks = {
  BOLD: 1,
  DIM: 2,
  ITALIC: 4,
  UNDERLINE: 8,
  BLINK: 16,
  INVERT: 32,
  HIDDEN: 64,
  STRIKETHROUGH: 128,
}
