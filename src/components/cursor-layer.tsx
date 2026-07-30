import type { CSSProperties, RefObject } from "react";

import {
  CURSOR_LAYER_CLASS_NAME,
  NATIVE_CURSOR_HIDDEN_CLASS_NAME,
} from "../constants";

export interface CursorLayerProps {
  cursorRef: RefObject<HTMLDivElement>;
  className?: string;
  style?: CSSProperties;
  zIndex?: number;
}

export function CursorLayer({
  cursorRef,
  className,
  style,
  zIndex = 9999,
}: CursorLayerProps) {
  const classNames = [CURSOR_LAYER_CLASS_NAME, className].filter(Boolean).join(" ");
  const cursorStyles =
    `.${NATIVE_CURSOR_HIDDEN_CLASS_NAME}, ` +
    `.${NATIVE_CURSOR_HIDDEN_CLASS_NAME} * { cursor: none !important; }`;

  return (
    <>
      <style>{cursorStyles}</style>
      <div
        ref={cursorRef}
        aria-hidden="true"
        className={classNames}
        style={{
          backgroundColor: "transparent",
          border: "0 solid transparent",
          mixBlendMode: "difference",
          willChange: "transform, opacity",
          ...style,
          // these need to win over consumer styles or we are gonna have problems
          pointerEvents: "none",
          position: "fixed",
          left: 0,
          top: 0,
          zIndex,
          boxSizing: "border-box",
        }}
      />
    </>
  );
}
