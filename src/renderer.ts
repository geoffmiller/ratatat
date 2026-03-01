import { LayoutNode } from './layout.js';
import cliBoxes from 'cli-boxes';
import { resolveColor } from './styles.js';

export function renderTreeToBuffer(
  root: LayoutNode,
  buffer: Uint32Array,
  cols: number,
  rows: number
) {
  // Clear buffer first
  for (let i = 0; i < buffer.length; i += 2) {
      buffer[i] = 32; // ' ' char code
      buffer[i + 1] = (0 << 16) | (255 << 8) | 255;
  }

  // Two-pass render:
  //   Pass 1: paint backgrounds + text for the whole tree (children can overpaint freely)
  //   Pass 2: repaint borders on top of everything (so no child can overwrite them)
  const borderJobs: Array<{ node: LayoutNode; absX: number; absY: number; w: number; h: number; fg: number; bg: number; styles: number }> = [];

  try {
    paintNode(root, buffer, cols, rows, 0, 0, root.fg, root.bg, root.styles, borderJobs);
    // Repaint all borders on top, in tree order (parents before children = correct stacking)
    for (const job of borderJobs) {
      paintBorder(job.node, buffer, cols, rows, job.absX, job.absY, job.w, job.h, job.fg, job.bg, job.styles);
    }
  } catch (err) {
    console.error("Renderer Error:", err);
  }
}

function writeCell(
  buffer: Uint32Array, cols: number, rows: number,
  sx: number, sy: number, charCode: number, attrCode: number
) {
  if (sx < 0 || sx >= cols || sy < 0 || sy >= rows) return;
  const idx = (sy * cols + sx) * 2;
  buffer[idx] = charCode;
  buffer[idx + 1] = attrCode;
}

function paintBorder(
  node: LayoutNode,
  buffer: Uint32Array,
  cols: number,
  rows: number,
  absX: number,
  absY: number,
  w: number,
  h: number,
  fg: number,
  bg: number,
  styles: number,
) {
  if (!node._style?.borderStyle) return;

  const box = (cliBoxes as any)[node._style.borderStyle];
  const borderFg  = node._style.borderColor !== undefined ? resolveColor(node._style.borderColor) : fg;
  const borderAttr = (styles << 16) | (bg << 8) | borderFg;

  const showTop    = node._style.borderTop    !== false;
  const showBottom = node._style.borderBottom !== false;
  const showLeft   = node._style.borderLeft   !== false;
  const showRight  = node._style.borderRight  !== false;

  if (showTop) {
    for (let x = 0; x < w; x++) {
      const ch = (x === 0 && showLeft) ? box.topLeft
               : (x === w-1 && showRight) ? box.topRight
               : box.top;
      writeCell(buffer, cols, rows, absX + x, absY, ch.codePointAt(0)!, borderAttr);
    }
  }

  if (showBottom) {
    for (let x = 0; x < w; x++) {
      const ch = (x === 0 && showLeft) ? box.bottomLeft
               : (x === w-1 && showRight) ? box.bottomRight
               : box.bottom;
      writeCell(buffer, cols, rows, absX + x, absY + h - 1, ch.codePointAt(0)!, borderAttr);
    }
  }

  const yStart = showTop    ? 1 : 0;
  const yEnd   = showBottom ? h - 1 : h;
  for (let y = yStart; y < yEnd; y++) {
    if (showLeft)  writeCell(buffer, cols, rows, absX,         absY + y, box.left.codePointAt(0)!,  borderAttr);
    if (showRight) writeCell(buffer, cols, rows, absX + w - 1, absY + y, box.right.codePointAt(0)!, borderAttr);
  }
}

function paintNode(
  node: LayoutNode,
  buffer: Uint32Array,
  cols: number,
  rows: number,
  parentX: number,
  parentY: number,
  parentFg: number,
  parentBg: number,
  parentStyles: number,
  borderJobs: Array<{ node: LayoutNode; absX: number; absY: number; w: number; h: number; fg: number; bg: number; styles: number }>,
) {
  const layout = node.getLayout();

  const absX = Math.round(parentX + layout.left);
  const absY = Math.round(parentY + layout.top);
  const w    = Math.round(layout.width);
  const h    = Math.round(layout.height);

  const fg     = node.fg     !== 255 ? node.fg     : parentFg;
  const bg     = node.bg     !== 255 ? node.bg     : parentBg;
  const styles = node.styles !== 0   ? node.styles : parentStyles;

  if (!node.text) {
    // Fill background
    const attrCode = (styles << 16) | (bg << 8) | fg;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        writeCell(buffer, cols, rows, absX + x, absY + y, 32, attrCode);
      }
    }

    // Queue border repaint for pass 2 (so children can't erase it)
    if (node._style?.borderStyle) {
      borderJobs.push({ node, absX, absY, w, h, fg, bg, styles });
    }
  } else {
    // Text node: optionally fill background then paint characters
    const attrCode = (styles << 16) | (bg << 8) | fg;

    if (node.bg !== 255) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          writeCell(buffer, cols, rows, absX + x, absY + y, 32, attrCode);
        }
      }
    }

    let cursorX = 0;
    let cursorY = 0;
    for (let i = 0; i < node.text.length; i++) {
      if (node.text[i] === '\n') { cursorX = 0; cursorY++; continue; }
      if (cursorX >= w)          { cursorX = 0; cursorY++; }
      if (cursorY >= h) break;

      writeCell(buffer, cols, rows, absX + cursorX, absY + cursorY, node.text.codePointAt(i) || 32, attrCode);
      if (node.text.codePointAt(i)! > 0xFFFF) i++;
      cursorX++;
    }
  }

  // Recurse into children
  for (const child of node.children) {
    paintNode(child, buffer, cols, rows, absX, absY, fg, bg, styles, borderJobs);
  }
}
