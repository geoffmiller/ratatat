import { LayoutNode } from './layout.js';
import cliBoxes from 'cli-boxes';

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

  // Recurse and paint — initial clip is the full screen
  try {
    paintNode(root, buffer, cols, rows, 0, 0, root.fg, root.bg, root.styles, 0, 0, cols - 1, rows - 1);
  } catch (err) {
    console.error("Renderer Error:", err);
  }
}

/**
 * clipX1/clipY1/clipX2/clipY2 — the rectangle this node is allowed to paint into.
 * Children are further clipped to this node's content area (inside border+padding).
 * This prevents children from overwriting their parent's border characters.
 */
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
  clipX1: number,
  clipY1: number,
  clipX2: number,
  clipY2: number,
) {
  const layout = node.getLayout();

  // Calculate absolute positions
  const absX = Math.round(parentX + layout.left);
  const absY = Math.round(parentY + layout.top);
  const w = Math.round(layout.width);
  const h = Math.round(layout.height);

  const fg = node.fg !== 255 ? node.fg : parentFg;
  const bg = node.bg !== 255 ? node.bg : parentBg;
  const styles = node.styles !== 0 ? node.styles : parentStyles;

  // Helper: write a cell only if it falls within both the screen and the clip rect
  const writeCell = (sx: number, sy: number, charCode: number, attrCode: number) => {
    if (sx < 0 || sx >= cols || sy < 0 || sy >= rows) return;
    if (sx < clipX1 || sx > clipX2 || sy < clipY1 || sy > clipY2) return;
    const idx = (sy * cols + sx) * 2;
    buffer[idx] = charCode;
    buffer[idx + 1] = attrCode;
  };

  if (!node.text) {
    const charCode = 32; // ' '
    const attrCode = (styles << 16) | (bg << 8) | fg;

    // Fill background
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        writeCell(absX + x, absY + y, charCode, attrCode);
      }
    }

    // Draw border on top of background
    if (node._style?.borderStyle) {
      const box = (cliBoxes as any)[node._style.borderStyle];
      const borderFg = node._style.borderColor !== undefined ? node._style.borderColor : fg;
      const borderAttr = (styles << 16) | (bg << 8) | borderFg;

      const showTop    = node._style.borderTop    !== false;
      const showBottom = node._style.borderBottom !== false;
      const showLeft   = node._style.borderLeft   !== false;
      const showRight  = node._style.borderRight  !== false;

      // Top row
      if (showTop) {
        for (let x = 0; x < w; x++) {
          const ch = x === 0 && showLeft  ? box.topLeft
                   : x === w-1 && showRight ? box.topRight
                   : box.top;
          writeCell(absX + x, absY, ch.codePointAt(0)!, borderAttr);
        }
      }

      // Bottom row
      if (showBottom) {
        for (let x = 0; x < w; x++) {
          const ch = x === 0 && showLeft  ? box.bottomLeft
                   : x === w-1 && showRight ? box.bottomRight
                   : box.bottom;
          writeCell(absX + x, absY + h - 1, ch.codePointAt(0)!, borderAttr);
        }
      }

      // Left and right columns (skip corners already drawn)
      const yStart = showTop    ? 1 : 0;
      const yEnd   = showBottom ? h - 1 : h;
      for (let y = yStart; y < yEnd; y++) {
        if (showLeft)  writeCell(absX,         absY + y, box.left.codePointAt(0)!,  borderAttr);
        if (showRight) writeCell(absX + w - 1, absY + y, box.right.codePointAt(0)!, borderAttr);
      }
    }
  } else {
    // Text node: optionally fill background, then paint characters
    const attrCode = (styles << 16) | (bg << 8) | fg;

    if (node.bg !== 255) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          writeCell(absX + x, absY + y, 32, attrCode);
        }
      }
    }

    let cursorX = 0;
    let cursorY = 0;
    for (let i = 0; i < node.text.length; i++) {
      if (node.text[i] === '\n') { cursorX = 0; cursorY++; continue; }
      if (cursorX >= w)          { cursorX = 0; cursorY++; }
      if (cursorY >= h) break;

      writeCell(absX + cursorX, absY + cursorY, node.text.codePointAt(i) || 32, attrCode);
      if (node.text.codePointAt(i)! > 0xFFFF) i++;
      cursorX++;
    }
  }

  // Compute the clip rect for children: inside this node's border (if any)
  const hasBorder = !!node._style?.borderStyle;
  const borderInset = hasBorder ? 1 : 0;
  const childClipX1 = Math.max(clipX1, absX + borderInset);
  const childClipY1 = Math.max(clipY1, absY + borderInset);
  const childClipX2 = Math.min(clipX2, absX + w - 1 - borderInset);
  const childClipY2 = Math.min(clipY2, absY + h - 1 - borderInset);

  // Paint children, clipped to this node's content area
  for (const child of node.children) {
    paintNode(child, buffer, cols, rows, absX, absY, fg, bg, styles,
              childClipX1, childClipY1, childClipX2, childClipY2);
  }
}
