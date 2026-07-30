import type { CursorVariant } from "../types";
import { readWithNativeCursorVisible } from "./nativeCursor";
export type { CursorState } from "../types";

export const DEFAULT_CURSOR_ATTRIBUTE = "data-cursor";
export const CURSOR_COLOR_ATTRIBUTE = "data-cursor-color";
export const CURSOR_SPACING_ATTRIBUTE = "data-cursor-spacing";
export const CURSOR_OFFSET_X_ATTRIBUTE = "data-cursor-offset-x";
export const CURSOR_OFFSET_Y_ATTRIBUTE = "data-cursor-offset-y";
const DEFAULT_LINK_SELECTOR = 'a, [role="link"]';
const BUTTON_SELECTOR = [
  "button",
  '[role="button"]',
  'input:not([type="hidden"])',
  "textarea",
  '[contenteditable]:not([contenteditable="false"])',
  "select",
  "summary",
  ".clickable",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export interface DetectorOptions {
  cursorAttribute?: string;
  textHitPadding?: number;
}

export interface CursorDetection {
  readonly variant: CursorVariant;
  readonly target: Element | null;
  readonly textHeight: number | null;
}

interface TextHit {
  readonly matches: boolean;
  readonly height: number | null;
}

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

export function isTextEditingTarget(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLInputElement) {
    return !NON_TEXT_INPUT_TYPES.has(element.type);
  }

  return element instanceof HTMLElement && element.isContentEditable;
}

function getParentElement(element: Element): Element | null {
  const parent = element.parentElement;
  if (parent) return parent;

  const root = element.getRootNode();
  return typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot
    ? root.host
    : null;
}

function getTextRects(element: Element): DOMRect[] {
  const rects: DOMRect[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    if (node.nodeValue?.trim()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      rects.push(...Array.from(range.getClientRects()));
    }

    node = walker.nextNode();
  }

  return rects;
}

export function normalizeCursorVariant(value: string | null | undefined): CursorVariant | null {
  const variant = value?.trim().toLowerCase();

  if (!variant) return null;
  if (variant === "clickable") return "button";
  if (
    variant === "default" ||
    variant === "text" ||
    variant === "link" ||
    variant === "button" ||
    variant === "none"
  ) {
    return variant;
  }

  return null;
}

export function createDetector({
  cursorAttribute = DEFAULT_CURSOR_ATTRIBUTE,
  textHitPadding = 2,
}: DetectorOptions = {}) {
  const hitPadding = Number.isFinite(textHitPadding) ? Math.max(0, textHitPadding) : 2;
  let activeTextTarget: Element | null = null;
  let activeTextRects: DOMRect[] = [];
  let pointerTargetCache = new WeakMap<Element, Element | null>();

  function getCursorVariant(element: Element | null): CursorVariant | null {
    return getExplicitCursorTarget(element)?.variant ?? null;
  }

  function getExplicitCursorTarget(element: Element | null): CursorDetection | null {
    let current: Element | null = element;
    while (current) {
      const variant = normalizeCursorVariant(current.getAttribute(cursorAttribute));
      if (variant) return { variant, target: current, textHeight: null };

      current = getParentElement(current);
    }

    return null;
  }

  const getCursorType = getCursorVariant;

  function getTextHit(x: number, y: number, target: Element): TextHit {
    const manualType = getCursorVariant(target);
    const isForcedText = manualType === "text";
    if (manualType !== null && !isForcedText) {
      return { matches: false, height: null };
    }

    if (!target || target === document.body || target.tagName === "HTML") {
      return { matches: isForcedText, height: null };
    }

    if (activeTextTarget !== target) {
      activeTextTarget = target;
      activeTextRects = target.textContent?.trim() ? getTextRects(target) : [];
    }

    if (activeTextRects.length === 0) {
      return { matches: isForcedText, height: null };
    }

    for (let i = 0; i < activeTextRects.length; i++) {
      const rect = activeTextRects[i];
      if (
        x >= rect.left - hitPadding &&
        x <= rect.right + hitPadding &&
        y >= rect.top - hitPadding &&
        y <= rect.bottom + hitPadding
      ) {
        return { matches: true, height: rect.height };
      }
    }

    return {
      matches: isForcedText,
      height: isForcedText ? activeTextRects[0].height : null,
    };
  }

  function isOverText(x: number, y: number, target: Element): boolean {
    return getTextHit(x, y, target).matches;
  }

  function invalidateTextCache() {
    activeTextTarget = null;
    activeTextRects = [];
  }

  function invalidatePointerTargetCache() {
    pointerTargetCache = new WeakMap();
  }

  function closest(element: Element | null, selector: string): Element | null {
    let current: Element | null = element;

    while (current) {
      try {
        if (current.matches(selector)) return current;
      } catch {
        return null;
      }

      current = getParentElement(current);
    }

    return null;
  }

  function getPointerTarget(element: Element | null): Element | null {
    if (!element) return null;
    if (pointerTargetCache.has(element)) {
      return pointerTargetCache.get(element) ?? null;
    }

    const pointerTarget = readWithNativeCursorVisible(() => {
      let current: Element | null = element;

      while (current) {
        if (window.getComputedStyle(current).cursor === "pointer") {
          return current;
        }

        current = getParentElement(current);
      }

      return null;
    });

    pointerTargetCache.set(element, pointerTarget);
    return pointerTarget;
  }

  function detect(x: number, y: number, element: Element | null): CursorDetection {
    if (!element) return { variant: "default", target: null, textHeight: null };

    const explicitCursorTarget = getExplicitCursorTarget(element);
    if (explicitCursorTarget) {
      if (explicitCursorTarget.variant === "text" && explicitCursorTarget.target) {
        return {
          ...explicitCursorTarget,
          textHeight: getTextHit(x, y, explicitCursorTarget.target).height,
        };
      }

      return explicitCursorTarget;
    }

    const linkTarget = closest(element, DEFAULT_LINK_SELECTOR);
    if (linkTarget) return { variant: "link", target: linkTarget, textHeight: null };

    const buttonTarget = closest(element, BUTTON_SELECTOR) ?? getPointerTarget(element);
    if (buttonTarget) return { variant: "button", target: buttonTarget, textHeight: null };

    const textHit = getTextHit(x, y, element);
    if (textHit.matches) {
      return { variant: "text", target: element, textHeight: textHit.height };
    }

    return { variant: "default", target: null, textHeight: null };
  }

  return {
    detect,
    getCursorVariant,
    getCursorType,
    isOverText,
    invalidateTextCache,
    invalidatePointerTargetCache,
  };
}

export type Detector = ReturnType<typeof createDetector>;
