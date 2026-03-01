// @ts-nocheck
import ReactReconciler from 'react-reconciler';
import { DefaultEventPriority, NoEventPriority } from 'react-reconciler/constants.js';
import * as Scheduler from 'scheduler';
import { createContext } from 'react';
import { LayoutNode } from './layout.js';
import { applyStyles, Styles } from './styles.js';
import Yoga from 'yoga-layout-prebuilt';

type Type = 'box' | 'text';
type Props = any;
type Container = LayoutNode;
type Instance = LayoutNode;
type TextInstance = LayoutNode;
type SuspenseInstance = any;
type HydratableInstance = any;
type PublicInstance = any;
type HostContext = any;
type UpdatePayload = any;
type ChildSet = any;
type TimeoutHandle = any;
type NoTimeout = any;

type TransitionStatus = any;

export let onAfterCommit: (() => void) | null = null;
export function setOnAfterCommit(fn: (() => void) | null) { onAfterCommit = fn; }

const hostConfig: ReactReconciler.HostConfig<
  Type, Props, Container, Instance, TextInstance, SuspenseInstance, 
  HydratableInstance, PublicInstance, HostContext, UpdatePayload, 
  ChildSet, TimeoutHandle, NoTimeout, TransitionStatus
> = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: true,

  createInstance(type, props, rootContainer, hostContext, internalHandle) {
    const node = new LayoutNode();
    
    // Apply Yoga styles
    const stylesToApply: Styles = { ...props };
    if (type === 'text' && stylesToApply.flexDirection === undefined) {
      stylesToApply.flexDirection = 'row';
    }
    applyStyles(node.yogaNode, stylesToApply);
    
    // Apply custom Terminal properties out-of-band of layout
    if (props.bg !== undefined) node.bg = props.bg;
    if (props.fg !== undefined) node.fg = props.fg;
    if (props.styles !== undefined) node.styles = props.styles;
    node._style = props;

    return node;
  },

  createTextInstance(text, rootContainer, hostContext, internalHandle) {
    const node = new LayoutNode();
    node.text = text;
    // Text nodes shouldn't expand like block elements in standard HTML, 
    // but in terminal we just let parent dictate constraints or auto measure.
    // For MVP, set width to text length.
    node.yogaNode.setWidth(text.length);
    node.yogaNode.setHeight(1);
    return node;
  },

  appendInitialChild(parentInstance, child) {
    parentInstance.insertChild(child, parentInstance.children.length);
  },

  appendChild(parentInstance, child) {
    parentInstance.insertChild(child, parentInstance.children.length);
  },

  appendChildToContainer(container, child) {
    container.insertChild(child, container.children.length);
  },

  removeChild(parentInstance, child) {
    parentInstance.removeChild(child);
  },

  removeChildFromContainer(container, child) {
    container.removeChild(child);
  },

  insertBefore(parentInstance, child, beforeChild) {
    const index = parentInstance.children.indexOf(beforeChild);
    parentInstance.insertChild(child, index);
  },

  prepareUpdate(instance, type, oldProps, newProps, rootContainer, hostContext) {
    return true; // Always update for MVP
  },

  commitUpdate(instance, updatePayload, type, prevProps, nextProps, internalHandle) {
    // Re-apply Yoga styles on update
    applyStyles(instance.yogaNode, nextProps as Styles, prevProps as Styles);

    // Re-apply custom properties
    if (nextProps.bg !== undefined) instance.bg = nextProps.bg;
    if (nextProps.fg !== undefined) instance.fg = nextProps.fg;
    if (nextProps.styles !== undefined) instance.styles = nextProps.styles;
    instance._style = nextProps;
  },

  commitTextUpdate(textInstance, oldText, newText) {
    textInstance.text = newText;
    textInstance.yogaNode.setWidth(newText.length);
  },

  getRootHostContext(rootContainer) {
    return { isInsideText: false };
  },

  getChildHostContext(parentHostContext, type, rootContainer) {
    return { isInsideText: type === 'text' };
  },

  getPublicInstance(instance) {
    return instance;
  },

  prepareForCommit(containerInfo) {
    return null;
  },

  resetAfterCommit(containerInfo: any) {
    if (typeof onAfterCommit === 'function') onAfterCommit();
  },
  shouldSetTextContent(type: any, props: any) { return false; },
  clearContainer(container: any) { },
  finalizeInitialChildren(instance: any, type: any, props: any, rootContainer: any, hostContext: any) { return false; },
  
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  
  scheduleMicrotask: typeof queueMicrotask === 'function' ? queueMicrotask : setTimeout,
  scheduleCallback: Scheduler.unstable_scheduleCallback,
  cancelCallback: Scheduler.unstable_cancelCallback,
  shouldYield: Scheduler.unstable_shouldYield,
  now: Scheduler.unstable_now,

  isPrimaryRenderer: true,
  warnsIfNotActing: true,
  
  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur: () => {},
  afterActiveInstanceBlur: () => {},
  preparePortalMount: () => {},
  prepareScopeUpdate: () => {},
  getCurrentEventPriority: () => DefaultEventPriority,
  setCurrentUpdatePriority: (p: any) => {},
  getCurrentUpdatePriority: () => DefaultEventPriority,
  detachDeletedInstance: () => {},
  resolveUpdatePriority: () => DefaultEventPriority,
  trackSchedulerEvent: () => {},
  resolveEventType: () => null,
  resolveEventTimeStamp: () => -1.1,
  requestPostPaintCallback: () => {},
  maySuspendCommit: () => true,
  preloadInstance: () => true,
  startSuspendingCommit: () => {},
  suspendInstance: () => {},
  waitForCommitToBeReady: () => null,
  NotPendingTransition: undefined,
  HostTransitionContext: createContext(null) as any,
} as any;

export const RatatatReconciler = ReactReconciler(hostConfig);
