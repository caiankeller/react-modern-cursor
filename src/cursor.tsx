"use client";

import type { CSSProperties } from "react";

import { CursorLayer } from "./components/cursor-layer";
import { useCursorController } from "./hooks/useCursorController";
import { useMediaQuery } from "./hooks/useMediaQuery";
import type {
  CursorColor,
  CursorOffset,
  CursorSpacing,
  CursorVariant,
} from "./types";
import { DEFAULT_CURSOR_ATTRIBUTE } from "./utils/detect";

export interface CursorProps {
  /**
   * CSS media query to disable the custom cursor (e.g., on touch devices).
   * @default "(max-width: 768px)"
   */
  hideMediaQuery?: string;
  /**
   * Forces one behavior instead of auto-detecting hovered elements.
   */
  variant?: CursorVariant;
  /**
   * Attribute used for explicit per-element variants.
   * @default "data-cursor"
   */
  cursorAttribute?: string;
  /**
   * Cursor color for every variant, or colors keyed by variant.
   * @default "#fff"
   */
  color?: CursorColor;
  /**
   * Space around every target-aware variant, or spacing keyed by link and button.
   */
  spacing?: CursorSpacing;
  /**
   * Cursor offset for every variant, or offsets keyed by variant.
   */
  offset?: CursorOffset;
  /**
   * Extra hit area around text rects, in pixels.
   * @default 2
   */
  textHitPadding?: number;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  zIndex?: number;
}

export default function Cursor({
  hideMediaQuery = "(max-width: 768px)",
  variant,
  cursorAttribute = DEFAULT_CURSOR_ATTRIBUTE,
  color,
  spacing,
  offset,
  textHitPadding = 2,
  disabled = false,
  className,
  style,
  zIndex,
}: CursorProps) {
  const isHiddenByMediaQuery = useMediaQuery(hideMediaQuery);
  const { cursorRef } = useCursorController({
    variant,
    cursorAttribute,
    color,
    spacing,
    offset,
    textHitPadding,
    disabled: disabled || isHiddenByMediaQuery,
  });

  return (
    <CursorLayer
      cursorRef={cursorRef}
      className={className}
      style={style}
      zIndex={zIndex}
    />
  );
}
