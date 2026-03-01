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

  // Recurse and paint
  try {
    paintNode(root, buffer, cols, rows, 0, 0, root.fg, root.bg, root.styles);
  } catch (err) {
    console.error("Renderer Error:", err);
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
  parentStyles: number
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

  // Paint Background/Foreground of the box
  // If the node has no specific character but does have colors, paint spaces
  if (!node.text) {
     const charCode = 32; // ' '
     const attrCode = (styles << 16) | (bg << 8) | fg;
     for (let y = 0; y < h; y++) {
       for (let x = 0; x < w; x++) {
         const screenX = absX + x;
         const screenY = absY + y;
         if (screenX >= 0 && screenX < cols && screenY >= 0 && screenY < rows) {
           const idx = (screenY * cols + screenX) * 2;
           buffer[idx] = charCode;
           buffer[idx + 1] = attrCode;
         }
       }
     }
     
     // Box Borders (After background)
     if (node._style?.borderStyle) {
        const box = (cliBoxes as any)[node._style.borderStyle];
        const attrCode = (styles << 16) | (bg << 8) | fg;
        
        const showTopBorder = node._style.borderTop !== false;
        const showBottomBorder = node._style.borderBottom !== false;
        const showLeftBorder = node._style.borderLeft !== false;
        const showRightBorder = node._style.borderRight !== false;
        
        // Top and Bottom
        for (let x = 0; x < w; x++) {
            const screenX = absX + x;
            if (showTopBorder && absY >= 0 && absY < rows && screenX >= 0 && screenX < cols) {
               const charC = (x === 0 && showLeftBorder ? box.topLeft : x === w - 1 && showRightBorder ? box.topRight : box.top).codePointAt(0);
               const idx = (absY * cols + screenX) * 2;
               buffer[idx] = charC;
               buffer[idx + 1] = attrCode;
            }
            if (showBottomBorder && absY + h - 1 >= 0 && absY + h - 1 < rows && screenX >= 0 && screenX < cols) {
               const charC = (x === 0 && showLeftBorder ? box.bottomLeft : x === w - 1 && showRightBorder ? box.bottomRight : box.bottom).codePointAt(0);
               const idx = ((absY + h - 1) * cols + screenX) * 2;
               buffer[idx] = charC;
               buffer[idx + 1] = attrCode;
            }
        }
        
        // Left and Right
        for (let y = showTopBorder ? 1 : 0; y < (showBottomBorder ? h - 1 : h); y++) {
            const screenY = absY + y;
            if (screenY >= 0 && screenY < rows) {
                if (showLeftBorder && absX >= 0 && absX < cols) {
                   const idx = (screenY * cols + absX) * 2;
                   buffer[idx] = box.left.codePointAt(0);
                   buffer[idx + 1] = attrCode;
                }
                if (showRightBorder && absX + w - 1 >= 0 && absX + w - 1 < cols) {
                   const idx = (screenY * cols + (absX + w - 1)) * 2;
                   buffer[idx] = box.right.codePointAt(0);
                   buffer[idx + 1] = attrCode;
                }
            }
        }
     }
  } else {
    // Has text: paint the bounding box background first
    const attrCode = (styles << 16) | (bg << 8) | fg;
    
    // Only paint a background block if this node has an explicit background override
    // Otherwise it inherits from the Flexbox parent's background already
    if (node.bg !== 255) {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const screenX = absX + x;
            const screenY = absY + y;
            if (screenX >= 0 && screenX < cols && screenY >= 0 && screenY < rows) {
              const idx = (screenY * cols + screenX) * 2;
              buffer[idx] = 32; // ' '
              buffer[idx + 1] = attrCode;
            }
          }
        }
    }

    let cursorX = 0;
    let cursorY = 0;

    for (let i = 0; i < node.text.length; i++) {
        // Line break manually or automatically wrap
        if (node.text[i] === '\n') {
            cursorX = 0;
            cursorY++;
            continue;
        }
        if (cursorX >= w) {
            cursorX = 0;
            cursorY++;
        }
        if (cursorY >= h) break; // Truncate at box boundary

        const screenX = absX + cursorX;
        const screenY = absY + cursorY;
        
        if (screenX >= 0 && screenX < cols && screenY >= 0 && screenY < rows) {
           const idx = (screenY * cols + screenX) * 2;
           buffer[idx] = node.text.codePointAt(i) || 32;
           buffer[idx + 1] = attrCode;
        }
        
        if (node.text.codePointAt(i)! > 0xFFFF) i++;
        
        cursorX++;
    }
  }

  // Paint Children
  for (const child of node.children) {
    paintNode(child, buffer, cols, rows, absX, absY, fg, bg, styles);
  }
}
