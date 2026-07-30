import type { CSSProperties } from "react";

export type BuiltInCursorVariant = "default" | "text" | "link" | "button" | "none";
export type CursorVariant = BuiltInCursorVariant | "clickable";
export type CursorVisualVariant = Exclude<BuiltInCursorVariant, "none">;
export type CursorVariantValues<Value> = {
  readonly [Variant in CursorVisualVariant]?: Value;
};

export type CursorColorValue = NonNullable<CSSProperties["color"]>;
export type CursorColor = CursorColorValue | CursorVariantValues<CursorColorValue>;

export type CursorTargetVariant = Extract<CursorVisualVariant, "link" | "button">;
export type CursorSpacingValues = {
  readonly [Variant in CursorTargetVariant]?: number;
};
export type CursorSpacing = number | CursorSpacingValues;

export interface CursorOffsetValue {
  readonly x?: number;
  readonly y?: number;
}

export type CursorOffset = CursorOffsetValue | CursorVariantValues<CursorOffsetValue>;

/**
 * Backwards-compatible name for older consumers that imported CursorState.
 */
export type CursorState = CursorVariant;
