import { YogaNode } from 'yoga-layout';
import Yoga from 'yoga-layout-prebuilt';

export class LayoutNode {
  public yogaNode: YogaNode;
  public children: LayoutNode[] = [];
  public parent: LayoutNode | null = null;
  
  // Custom terminal props
  private _text?: string;
  public fg: number = 255;
  public bg: number = 255;
  public styles: number = 0;
  public _style?: any;

  set text(value: string | undefined) {
    this._text = value;
    if (value !== undefined) {
      this.yogaNode.setMeasureFunc((width, widthMode, height, heightMode) => {
        let textLen = value.length;
        if (textLen === 0) return { width: 0, height: 0 };
        
        // Handle newlines intuitively
        const lines = value.split('\n');
        const maxLineWidth = Math.max(...lines.map(l => l.length));
        
        let targetWidth = maxLineWidth;
        
        if (widthMode === Yoga.MEASURE_MODE_EXACTLY) {
          targetWidth = width;
        } else if (widthMode === Yoga.MEASURE_MODE_AT_MOST) {
          targetWidth = Math.min(maxLineWidth, width);
        }

        let targetHeight = lines.length;
        if (targetWidth > 0 && maxLineWidth > targetWidth) {
           // Wrap lines
           targetHeight = lines.reduce((acc, line) => acc + Math.ceil(line.length / targetWidth), 0);
        }

        if (heightMode === Yoga.MEASURE_MODE_EXACTLY) {
          targetHeight = height;
        } else if (heightMode === Yoga.MEASURE_MODE_AT_MOST) {
          targetHeight = Math.min(targetHeight, height);
        }

        return { width: targetWidth, height: targetHeight };
      });
    } else {
      this.yogaNode.unsetMeasureFunc();
    }
  }

  get text(): string | undefined {
    return this._text;
  }

  constructor() {
    this.yogaNode = Yoga.Node.create();
    // Default to flex-direction column like Ink/React Native
    this.yogaNode.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN);
  }

  insertChild(child: LayoutNode, index: number) {
    this.children.splice(index, 0, child);
    child.parent = this;
    this.yogaNode.insertChild(child.yogaNode, index);
  }

  removeChild(child: LayoutNode) {
    const i = this.children.indexOf(child);
    if (i >= 0) {
      this.children.splice(i, 1);
      child.parent = null;
      this.yogaNode.removeChild(child.yogaNode);
    }
  }

  calculateLayout(width: number, height: number) {
    this.yogaNode.setWidth(width);
    this.yogaNode.setHeight(height);
    this.yogaNode.calculateLayout(width, height, Yoga.DIRECTION_LTR);
  }

  getLayout() {
    return this.yogaNode.getComputedLayout();
  }

  free() {
    this.yogaNode.free();
  }
}
