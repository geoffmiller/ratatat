import { YogaNode } from 'yoga-layout';
import Yoga from 'yoga-layout-prebuilt';

// Global registry: yogaNode → owning LayoutNode
// Used to reliably detach nodes regardless of JS object identity issues
// with the Yoga wasm wrapper's getParent() returning stale proxy objects.
const yogaOwner = new Map<YogaNode, LayoutNode>();

export class LayoutNode {
  public yogaNode: YogaNode;
  public children: LayoutNode[] = [];
  public parent: LayoutNode | null = null;
  private _destroyed = false;
  _hidden = false;  // set by Suspense hideInstance/unhideInstance

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
    // Remove from current owner first (yogaOwner is authoritative)
    const currentOwner = yogaOwner.get(child.yogaNode);
    if (currentOwner) {
      currentOwner.removeChild(child);
    }
    // Belt-and-suspenders: ask Yoga directly in case yogaOwner is stale
    const staleParent = child.yogaNode.getParent();
    if (staleParent) {
      staleParent.removeChild(child.yogaNode);
    }
    // Clamp index to Yoga's actual child count to stay in sync
    const yogaCount = this.yogaNode.getChildCount();
    const safeIndex = Math.min(index, yogaCount);
    // Insert into Yoga FIRST — if this throws, don't corrupt our JS bookkeeping
    try {
      this.yogaNode.insertChild(child.yogaNode, safeIndex);
    } catch {
      // Yoga refused the insert — child stays detached
      return;
    }
    // Only update JS bookkeeping after Yoga succeeds
    child.parent = this;
    this.children.splice(safeIndex, 0, child);
    yogaOwner.set(child.yogaNode, this);
  }

  removeChild(child: LayoutNode) {
    const i = this.children.indexOf(child);
    if (i >= 0) {
      this.children.splice(i, 1);
      child.parent = null;
      yogaOwner.delete(child.yogaNode);
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
    // Clear parent reference on children before clearing our own bookkeeping
    for (const child of this.children) {
      if (child.parent === this) child.parent = null;
    }
    this.children = [];
    yogaOwner.delete(this.yogaNode);
    // NOTE: Do NOT call yogaNode.free() here — freeing a Yoga wasm node
    // corrupts sibling/parent tracking of adjacent nodes in the wasm heap.
    // Yoga nodes are reclaimed when the wasm module is GC'd at process exit.
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
