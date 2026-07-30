import type {
  CursorColor,
  CursorColorValue,
  CursorOffset,
  CursorOffsetValue,
  CursorSpacing,
  CursorVariant,
  CursorVariantValues,
  CursorVisualVariant,
} from "../types";
import {
  CURSOR_COLOR_ATTRIBUTE,
  CURSOR_OFFSET_X_ATTRIBUTE,
  CURSOR_OFFSET_Y_ATTRIBUTE,
  CURSOR_SPACING_ATTRIBUTE,
} from "./detect";

export const DEFAULT_CURSOR_COLOR = "#fff";
export const ZERO_CURSOR_OFFSET = { x: 0, y: 0 } satisfies Required<CursorOffsetValue>;

function getFiniteNumber(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) ? value : undefined;
}

function getTargetAttribute(element: Element | null, attribute: string): string | undefined {
  const value = element?.getAttribute(attribute)?.trim();
  return value || undefined;
}

function getTargetNumberAttribute(element: Element | null, attribute: string): number | undefined {
  const value = getTargetAttribute(element, attribute);
  if (value === undefined) return undefined;

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function getTargetCurrentColor(element: Element | null, fallbackColor: string): string {
  if (!element) return fallbackColor;

  const color = window.getComputedStyle(element).color;
  return color || fallbackColor;
}

function isVisualVariant(variant: CursorVariant): variant is CursorVisualVariant {
  return variant !== "none" && variant !== "clickable";
}

function getVariantValue<Value>(
  variant: CursorVariant,
  values: CursorVariantValues<Value>,
): Value | undefined {
  return isVisualVariant(variant) ? values[variant] : undefined;
}

function resolveVariantValue<Value>(
  variant: CursorVariant,
  value: Value | CursorVariantValues<Value> | undefined,
  isValue: (value: Value | CursorVariantValues<Value>) => value is Value,
): Value | undefined {
  if (value === undefined) return undefined;
  return isValue(value) ? value : getVariantValue(variant, value);
}

export function copyVariantValues<Value>(
  values?: CursorVariantValues<Value>,
): CursorVariantValues<Value> | undefined {
  if (!values) return undefined;

  return {
    default: values.default,
    text: values.text,
    link: values.link,
    button: values.button,
  };
}

function isCursorColorValue(color: CursorColor): color is CursorColorValue {
  return typeof color === "string";
}

export interface CursorColorResolution {
  readonly value: string;
  readonly usesCurrentColor: boolean;
}

export function resolveCursorColor(
  variant: CursorVariant,
  target: Element | null,
  color: CursorColor = DEFAULT_CURSOR_COLOR,
): CursorColorResolution {
  const variantColor =
    getTargetAttribute(target, CURSOR_COLOR_ATTRIBUTE) ??
    resolveVariantValue(variant, color, isCursorColorValue) ??
    DEFAULT_CURSOR_COLOR;
  const usesCurrentColor = variantColor === "currentColor";

  return {
    value: usesCurrentColor
      ? getTargetCurrentColor(target, DEFAULT_CURSOR_COLOR)
      : variantColor,
    usesCurrentColor,
  };
}

function isCursorSpacingValue(spacing: CursorSpacing): spacing is number {
  return typeof spacing === "number";
}

export function resolveCursorSpacing(
  variant: CursorVariant,
  target: Element | null,
  spacing?: CursorSpacing,
): number | undefined {
  return getFiniteNumber(
    getTargetNumberAttribute(target, CURSOR_SPACING_ATTRIBUTE) ??
      resolveVariantValue(variant, spacing, isCursorSpacingValue),
  );
}

export function isCursorOffsetValue(offset: CursorOffset): offset is CursorOffsetValue {
  return !(
    "default" in offset ||
    "text" in offset ||
    "link" in offset ||
    "button" in offset
  );
}

export function copyCursorOffset(offset?: CursorOffset): CursorOffset | undefined {
  if (!offset) return undefined;
  if (isCursorOffsetValue(offset)) return { x: offset.x, y: offset.y };

  return {
    default: offset.default && { x: offset.default.x, y: offset.default.y },
    text: offset.text && { x: offset.text.x, y: offset.text.y },
    link: offset.link && { x: offset.link.x, y: offset.link.y },
    button: offset.button && { x: offset.button.x, y: offset.button.y },
  };
}

export function resolveCursorOffset(
  variant: CursorVariant,
  target: Element | null,
  offset?: CursorOffset,
): Required<CursorOffsetValue> {
  const variantOffset = resolveVariantValue(variant, offset, isCursorOffsetValue);

  return {
    x:
      getTargetNumberAttribute(target, CURSOR_OFFSET_X_ATTRIBUTE) ??
      getFiniteNumber(variantOffset?.x) ??
      0,
    y:
      getTargetNumberAttribute(target, CURSOR_OFFSET_Y_ATTRIBUTE) ??
      getFiniteNumber(variantOffset?.y) ??
      0,
  };
}
