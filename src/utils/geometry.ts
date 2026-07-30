import type { CursorVariant } from "../types";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface RectSnapshot {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

export interface GeometryTrackerState {
  readonly target: Element | null;
  readonly variant: CursorVariant | null;
  readonly snapshot: RectSnapshot | null;
}

export interface GeometryTrackerTransition {
  readonly state: GeometryTrackerState;
  readonly didMove: boolean;
}

export const EMPTY_GEOMETRY_TRACKER_STATE: GeometryTrackerState = {
  target: null,
  variant: null,
  snapshot: null,
};

export function hasUsableRect(rect: DOMRect): boolean {
  return rect.width > 0 && rect.height > 0;
}

export function getElementRect(element: Element): DOMRect | null {
  const rect = element.getBoundingClientRect();
  return hasUsableRect(rect) ? rect : null;
}

export function getHoveredInlineRect(element: Element, point: Point): DOMRect | null {
  const rects = Array.from(element.getClientRects()).filter(hasUsableRect);
  const hoveredRect = rects.find(
    (rect) =>
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom,
  );

  return hoveredRect ?? rects[0] ?? getElementRect(element);
}

export function variantHasTargetGeometry(variant: CursorVariant): boolean {
  return variant === "text" || variant === "link" || variant === "button";
}

export function toRectSnapshot(rect: DOMRect | null): RectSnapshot | null {
  if (!rect) return null;

  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function snapshotsAreEqual(left: RectSnapshot | null, right: RectSnapshot | null): boolean {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    left.top === right.top &&
    left.right === right.right &&
    left.bottom === right.bottom &&
    left.left === right.left &&
    left.width === right.width &&
    left.height === right.height
  );
}

export function readTargetGeometrySnapshot(
  variant: CursorVariant,
  target: Element | null,
  point: Point,
  trackDefault = false,
): RectSnapshot | null {
  if (!target || !target.isConnected) return null;
  if (variant === "link") return toRectSnapshot(getHoveredInlineRect(target, point));
  if (variantHasTargetGeometry(variant) || trackDefault) {
    return toRectSnapshot(getElementRect(target));
  }
  return null;
}

export function transitionGeometryTracker(
  previous: GeometryTrackerState,
  target: Element | null,
  variant: CursorVariant,
  snapshot: RectSnapshot | null,
): GeometryTrackerTransition {
  const identityChanged = previous.target !== target || previous.variant !== variant;
  const state = { target, variant, snapshot };

  return {
    state,
    didMove: !identityChanged && !snapshotsAreEqual(previous.snapshot, snapshot),
  };
}
