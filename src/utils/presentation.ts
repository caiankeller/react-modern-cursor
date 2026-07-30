import type {
  CursorColor,
  CursorOffset,
  CursorOffsetValue,
  CursorSpacing,
  CursorVariant,
} from "../types";
import type { CursorDetection } from "./detect";
import { isTextEditingTarget, normalizeCursorVariant } from "./detect";
import type { Point } from "./geometry";
import { variantHasTargetGeometry } from "./geometry";
import {
  DEFAULT_CURSOR_COLOR,
  resolveCursorColor,
  resolveCursorOffset,
  resolveCursorSpacing,
  ZERO_CURSOR_OFFSET,
} from "./options";
import {
  buildCursorShape,
  type CursorShape,
  readCursorShapeGeometry,
} from "./shape";

export interface CursorPresentation {
  readonly variant: CursorVariant;
  readonly target: Element | null;
  readonly color: string;
  readonly offset: Required<CursorOffsetValue>;
  readonly usesCurrentColor: boolean;
  readonly tracksTargetGeometry: boolean;
  readonly preservesNativeCursor: boolean;
  readonly shape: CursorShape | null;
}

export interface CursorPresentationOptions {
  readonly detection: CursorDetection;
  readonly point: Point;
  readonly color?: CursorColor;
  readonly spacing?: CursorSpacing;
  readonly offset?: CursorOffset;
}

export const INITIAL_CURSOR_PRESENTATION: CursorPresentation = {
  variant: "default",
  target: null,
  color: DEFAULT_CURSOR_COLOR,
  offset: ZERO_CURSOR_OFFSET,
  usesCurrentColor: false,
  tracksTargetGeometry: false,
  preservesNativeCursor: false,
  shape: null,
};

export function resolveCursorPresentation({
  detection,
  point,
  color = DEFAULT_CURSOR_COLOR,
  spacing,
  offset,
}: CursorPresentationOptions): CursorPresentation {
  const variant = normalizeCursorVariant(detection.variant) ?? "default";
  const colorResolution = resolveCursorColor(variant, detection.target, color);
  const resolvedOffset = resolveCursorOffset(variant, detection.target, offset);
  const tracksTargetGeometry = variantHasTargetGeometry(variant);

  return {
    variant,
    target: detection.target,
    color: colorResolution.value,
    offset: resolvedOffset,
    usesCurrentColor: colorResolution.usesCurrentColor,
    tracksTargetGeometry,
    preservesNativeCursor: variant === "button" && isTextEditingTarget(detection.target),
    shape:
      variant === "none"
        ? null
        : buildCursorShape(
            variant,
            point,
            detection.textHeight,
            readCursorShapeGeometry(variant, detection.target, point),
            {
              color: colorResolution.value,
              spacing: resolveCursorSpacing(variant, detection.target, spacing),
              offset: resolvedOffset,
            },
          ),
  };
}

export function shouldApplyCursorPresentation(
  previous: CursorPresentation,
  next: CursorPresentation,
  force = false,
): boolean {
  const previousShape = previous.shape;
  const nextShape = next.shape;
  const shapeChanged =
    previousShape === null || nextShape === null
      ? previousShape !== nextShape
      : previousShape.x !== nextShape.x ||
        previousShape.y !== nextShape.y ||
        previousShape.width !== nextShape.width ||
        previousShape.height !== nextShape.height ||
        previousShape.borderRadius !== nextShape.borderRadius ||
        previousShape.backgroundColor !== nextShape.backgroundColor ||
        previousShape.border !== nextShape.border ||
        previousShape.opacity !== nextShape.opacity ||
        previousShape.scale !== nextShape.scale;

  return (
    force ||
    previous.variant !== next.variant ||
    previous.target !== next.target ||
    previous.color !== next.color ||
    previous.offset.x !== next.offset.x ||
    previous.offset.y !== next.offset.y ||
    previous.preservesNativeCursor !== next.preservesNativeCursor ||
    shapeChanged
  );
}
