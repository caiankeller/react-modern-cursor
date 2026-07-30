import type { CursorOffsetValue, CursorVariant } from "../types";
import {
  getElementRect,
  getHoveredInlineRect,
  type Point,
  type RectSnapshot,
  toRectSnapshot,
} from "./geometry";
import { DEFAULT_CURSOR_COLOR, ZERO_CURSOR_OFFSET } from "./options";

const DEFAULT_SIZE = 30;
const TEXT_WIDTH = 2;
const LINK_HEIGHT = 2;
const LINK_OFFSET = 3;
const BUTTON_PADDING = 6;

export interface CursorShape extends Point {
  readonly width: number;
  readonly height: number;
  readonly borderRadius: string;
  readonly backgroundColor: string;
  readonly border: string;
  readonly opacity: number;
  readonly scale: number;
}

interface CursorShapeGeometry {
  readonly rect: RectSnapshot | null;
  readonly borderRadius: string;
}

export interface CursorShapeOptions {
  readonly color?: string;
  readonly spacing?: number;
  readonly offset?: Required<CursorOffsetValue>;
}

function getTargetBorderRadius(element: Element | null): string {
  if (!element) return "10px";

  const borderRadius = window.getComputedStyle(element).borderRadius;
  return borderRadius && borderRadius !== "0px" ? borderRadius : "10px";
}

export function readCursorShapeGeometry(
  variant: CursorVariant,
  target: Element | null,
  point: Point,
): CursorShapeGeometry {
  if (variant === "link") {
    return {
      rect: target ? toRectSnapshot(getHoveredInlineRect(target, point)) : null,
      borderRadius: "999px",
    };
  }

  if (variant === "button") {
    return {
      rect: target ? toRectSnapshot(getElementRect(target)) : null,
      borderRadius: getTargetBorderRadius(target),
    };
  }

  return { rect: null, borderRadius: "999px" };
}

function applyCursorOffset(
  shape: CursorShape,
  offset: Required<CursorOffsetValue>,
): CursorShape {
  return offset.x === 0 && offset.y === 0
    ? shape
    : { ...shape, x: shape.x + offset.x, y: shape.y + offset.y };
}

export function buildCursorShape(
  variant: CursorVariant,
  point: Point,
  textHeight: number | null,
  geometry: CursorShapeGeometry,
  options: CursorShapeOptions = {},
): CursorShape {
  const { color = DEFAULT_CURSOR_COLOR, spacing, offset = ZERO_CURSOR_OFFSET } = options;
  const linkOffset = spacing ?? LINK_OFFSET;
  const buttonPadding = spacing ?? BUTTON_PADDING;

  if (variant === "text") {
    return applyCursorOffset(
      {
        ...point,
        width: TEXT_WIDTH,
        height: textHeight ?? 24,
        borderRadius: "999px",
        backgroundColor: color,
        border: "0 solid transparent",
        opacity: 1,
        scale: 1,
      },
      offset,
    );
  }

  if (variant === "link") {
    return applyCursorOffset(
      {
        x: geometry.rect ? geometry.rect.left + geometry.rect.width / 2 : point.x,
        y: geometry.rect ? geometry.rect.bottom + linkOffset : point.y + 10,
        width: geometry.rect ? geometry.rect.width : 24,
        height: LINK_HEIGHT,
        borderRadius: "999px",
        backgroundColor: color,
        border: "0 solid transparent",
        opacity: 1,
        scale: 1,
      },
      offset,
    );
  }

  if (variant === "button") {
    return applyCursorOffset(
      {
        x: geometry.rect ? geometry.rect.left + geometry.rect.width / 2 : point.x,
        y: geometry.rect ? geometry.rect.top + geometry.rect.height / 2 : point.y,
        width: geometry.rect
          ? geometry.rect.width + buttonPadding * 2
          : DEFAULT_SIZE + buttonPadding * 2,
        height: geometry.rect
          ? geometry.rect.height + buttonPadding * 2
          : DEFAULT_SIZE + buttonPadding * 2,
        borderRadius: geometry.borderRadius,
        backgroundColor: "transparent",
        border: `1px solid ${color}`,
        opacity: 1,
        scale: 1,
      },
      offset,
    );
  }

  return applyCursorOffset(
    {
      ...point,
      width: DEFAULT_SIZE,
      height: DEFAULT_SIZE,
      borderRadius: "999px",
      backgroundColor: color,
      border: "0 solid transparent",
      opacity: 1,
      scale: 1,
    },
    offset,
  );
}
