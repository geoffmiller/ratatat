import { YogaNode } from 'yoga-layout';
import Yoga from 'yoga-layout-prebuilt';

export class LayoutNode {
  public yogaNode: YogaNode;
  public children: LayoutNode[] = [];
  public parent: LayoutNode | null = null;
  private _destroyed = false;

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
        if (value.length === 0) return { width: 0, height: 0 };

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
    // Detach from existing parent first — Yoga aborts if you insert a node
    // that already has a parent (happens during keyed list reordering).
    // We check both our own parent tracking AND the Yoga node's actual parent
    // in case they get out of sync.
    if (child.parent) {
      child.parent.removeChild(child);
    } else if (child.yogaNode.getParent()) {
      // Yoga parent exists but our tracking is stale — remove directly
      child.yogaNode.getParent()!.removeChild(child.yogaNode);
    }
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

  /**
   * Free this node's Yoga allocation. Called via detachDeletedInstance
   * in the reconciler after React has permanently removed this node.
   *
   * Does NOT recurse — React calls detachDeletedInstance on every node
   * in a deleted subtree individually, so each node frees only itself.
   * The _destroyed guard prevents double-free if free() is also called.
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.children = [];
    this.yogaNode.free();
  }

  calculateLayout(width: number, height: number) {
    this.yogaNode.setWidth(width);
    this.yogaNode.setHeight(height);
    this.yogaNode.calculateLayout(width, height, Yoga.DIRECTION_LTR);
  }

  getLayout() {
    return this.yogaNode.getComputedLayout();
  }

  /** @deprecated use destroy() */
  free() {
    this.destroy();
  }
}
