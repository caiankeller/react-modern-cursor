import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";

import type {
  CursorColor,
  CursorOffset,
  CursorSpacing,
  CursorVariant,
} from "../types";
import {
  CURSOR_LAYER_CLASS_NAME,
  NATIVE_CURSOR_HIDDEN_CLASS_NAME,
} from "../constants";
import { clamp, lerp } from "../utils/animate";
import {
  createDetector,
  normalizeCursorVariant,
  type CursorDetection,
} from "../utils/detect";
import {
  EMPTY_GEOMETRY_TRACKER_STATE,
  type GeometryTrackerState,
  type Point,
  readTargetGeometrySnapshot,
  transitionGeometryTracker,
} from "../utils/geometry";
import { setNativeCursorHidden } from "../utils/nativeCursor";
import {
  copyCursorOffset,
  copyVariantValues,
  DEFAULT_CURSOR_COLOR,
  isCursorOffsetValue,
  resolveCursorColor,
} from "../utils/options";
import {
  getMouseEventTarget,
  readPointerSnapshot,
  updatePointerSnapshot,
} from "../utils/pointer";
import {
  INITIAL_CURSOR_PRESENTATION,
  resolveCursorPresentation,
  shouldApplyCursorPresentation,
  type CursorPresentation,
} from "../utils/presentation";
import type { CursorShape } from "../utils/shape";

const CURSOR_TRANSITION =
  "width 260ms cubic-bezier(0.16,1,0.3,1), " +
  "height 260ms cubic-bezier(0.16,1,0.3,1), " +
  "border-radius 260ms cubic-bezier(0.16,1,0.3,1), " +
  "background-color 180ms ease, " +
  "border-color 180ms ease, " +
  "opacity 180ms ease";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function classesWithoutNativeCursor(value: string | null): string[] {
  return (value ?? "")
    .split(/\s+/)
    .filter((className) => className && className !== NATIVE_CURSOR_HIDDEN_CLASS_NAME)
    .sort();
}

function isIgnoredCursorMutation(mutation: MutationRecord): boolean {
  if (
    mutation.target instanceof Element &&
    mutation.target.classList.contains(CURSOR_LAYER_CLASS_NAME)
  ) {
    return true;
  }

  if (
    mutation.target !== document.documentElement ||
    mutation.type !== "attributes" ||
    mutation.attributeName !== "class"
  ) {
    return false;
  }

  const previousClasses = classesWithoutNativeCursor(mutation.oldValue);
  const currentClasses = classesWithoutNativeCursor(document.documentElement.className);

  return (
    previousClasses.length === currentClasses.length &&
    previousClasses.every((className, index) => className === currentClasses[index])
  );
}

export interface UseCursorControllerOptions {
  variant?: CursorVariant;
  cursorAttribute: string;
  color?: CursorColor;
  spacing?: CursorSpacing;
  offset?: CursorOffset;
  textHitPadding: number;
  disabled?: boolean;
}

function toPx(value: number): string {
  return `${Math.max(0, Math.round(value * 100) / 100)}px`;
}

function getCursorTransform(point: Point, scaleX = 1, scaleY = 1): string {
  return (
    `translate(-50%, -50%) ` +
    `translate3d(${point.x}px, ${point.y}px, 0) ` +
    `scaleX(${scaleX}) ` +
    `scaleY(${scaleY})`
  );
}

export function useCursorController({
  variant,
  cursorAttribute,
  color = DEFAULT_CURSOR_COLOR,
  spacing,
  offset,
  textHitPadding,
  disabled = false,
}: UseCursorControllerOptions) {
  const initialPointerSnapshot = readPointerSnapshot();
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const nativeCursorOwnerRef = useRef(Symbol("react-modern-cursor"));
  const mouseRef = useRef<Point>(initialPointerSnapshot.point ?? { x: 0, y: 0 });
  const positionRef = useRef<Point>(initialPointerSnapshot.point ?? { x: -200, y: -200 });
  const isVisibleRef = useRef(
    initialPointerSnapshot.isInsideDocument && initialPointerSnapshot.point !== null,
  );
  const presentationRef = useRef<CursorPresentation>(INITIAL_CURSOR_PRESENTATION);
  const refreshCurrentTargetRef = useRef<((force?: boolean) => void) | null>(null);
  const refreshCurrentColorRef = useRef<(() => void) | null>(null);
  const refreshMovingTargetRef = useRef<(() => void) | null>(null);
  const applyPendingPointerRef = useRef<((force?: boolean) => void) | null>(null);
  const pointerTargetRef = useRef<Element | null>(null);
  const pointerRefreshPendingRef = useRef(false);
  const targetRefreshPendingRef = useRef(false);
  const forceRefreshPendingRef = useRef(false);
  const appliedShapeRef = useRef<CursorShape | null>(null);
  const lastTransformRef = useRef("");
  const scrollVelocityRef = useRef(0);
  const scaleXRef = useRef(1);
  const scaleYRef = useRef(1);
  const baseScaleRef = useRef(1);
  const rafIdRef = useRef(0);

  const detector = useMemo(
    () => createDetector({ cursorAttribute, textHitPadding }),
    [cursorAttribute, textHitPadding],
  );

  const colorValue = typeof color === "string" ? color : undefined;
  const colorValues = typeof color === "string" ? undefined : color;
  const cursorColor = useMemo<CursorColor>(
    () => colorValue ?? copyVariantValues(colorValues) ?? DEFAULT_CURSOR_COLOR,
    [
      colorValue,
      colorValues?.default,
      colorValues?.text,
      colorValues?.link,
      colorValues?.button,
    ],
  );
  const spacingValue = typeof spacing === "number" ? spacing : undefined;
  const spacingValues = typeof spacing === "number" ? undefined : spacing;
  const cursorSpacing = useMemo<CursorSpacing | undefined>(
    () => spacingValue ?? copyVariantValues(spacingValues),
    [
      spacingValue,
      spacingValues?.link,
      spacingValues?.button,
    ],
  );
  const offsetValue = offset && isCursorOffsetValue(offset) ? offset : undefined;
  const offsetValues = offset && !isCursorOffsetValue(offset) ? offset : undefined;
  const cursorOffset = useMemo<CursorOffset | undefined>(
    () => copyCursorOffset(offset),
    [
      offsetValue?.x,
      offsetValue?.y,
      offsetValues?.default?.x,
      offsetValues?.default?.y,
      offsetValues?.text?.x,
      offsetValues?.text?.y,
      offsetValues?.link?.x,
      offsetValues?.link?.y,
      offsetValues?.button?.x,
      offsetValues?.button?.y,
    ],
  );

  const hideNativeCursor = useCallback(() => {
    setNativeCursorHidden(nativeCursorOwnerRef.current, true);
  }, []);

  const restoreNativeCursor = useCallback(() => {
    setNativeCursorHidden(nativeCursorOwnerRef.current, false);
  }, []);

  useIsomorphicLayoutEffect(() => {
    return restoreNativeCursor;
  }, [restoreNativeCursor]);

  useIsomorphicLayoutEffect(() => {
    if (!disabled) return;

    function trackMouseMove(e: MouseEvent) {
      updatePointerSnapshot({
        type: "move",
        point: { x: e.clientX, y: e.clientY },
      });
    }

    function trackMouseEnter(e: MouseEvent) {
      updatePointerSnapshot({
        type: "enter",
        point: { x: e.clientX, y: e.clientY },
      });
    }

    function trackMouseLeave() {
      updatePointerSnapshot({ type: "leave" });
    }

    document.addEventListener("mousemove", trackMouseMove);
    document.addEventListener("mouseenter", trackMouseEnter);
    document.addEventListener("mouseleave", trackMouseLeave);

    return () => {
      document.removeEventListener("mousemove", trackMouseMove);
      document.removeEventListener("mouseenter", trackMouseEnter);
      document.removeEventListener("mouseleave", trackMouseLeave);
    };
  }, [disabled]);

  const tick = useCallback(() => {
    rafIdRef.current = 0;
    const el = cursorRef.current;

    if (!el || !isVisibleRef.current) return;

    if (targetRefreshPendingRef.current) {
      targetRefreshPendingRef.current = false;
      pointerRefreshPendingRef.current = false;
      const force = forceRefreshPendingRef.current;
      forceRefreshPendingRef.current = false;
      refreshCurrentTargetRef.current?.(force);
    } else if (pointerRefreshPendingRef.current) {
      pointerRefreshPendingRef.current = false;
      const force = forceRefreshPendingRef.current;
      forceRefreshPendingRef.current = false;
      applyPendingPointerRef.current?.(force);
    } else {
      refreshMovingTargetRef.current?.();
    }

    scrollVelocityRef.current *= 0.88;
    if (Math.abs(scrollVelocityRef.current) < 0.01) {
      scrollVelocityRef.current = 0;
    }
    const distort = clamp(Math.abs(scrollVelocityRef.current) / 300, 0, 1);

    const targetScaleX = baseScaleRef.current * (1 - distort * 0.3);
    const targetScaleY = baseScaleRef.current * (1 + distort * 0.7);
    scaleXRef.current = lerp(scaleXRef.current, targetScaleX, 0.1);
    scaleYRef.current = lerp(scaleYRef.current, targetScaleY, 0.1);

    if (Math.abs(scaleXRef.current - targetScaleX) < 0.0001) {
      scaleXRef.current = targetScaleX;
    }
    if (Math.abs(scaleYRef.current - targetScaleY) < 0.0001) {
      scaleYRef.current = targetScaleY;
    }

    const transform = getCursorTransform(
      positionRef.current,
      scaleXRef.current,
      scaleYRef.current,
    );
    if (transform !== lastTransformRef.current) {
      el.style.transform = transform;
      lastTransformRef.current = transform;
    }

    if (presentationRef.current.usesCurrentColor) {
      refreshCurrentColorRef.current?.();
    }

    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  const ensureAnimationFrame = useCallback(() => {
    if (rafIdRef.current === 0) {
      rafIdRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  useIsomorphicLayoutEffect(() => {
    const el = cursorRef.current;
    if (!el) return;

    if (disabled) {
      isVisibleRef.current = false;
      presentationRef.current = {
        ...presentationRef.current,
        target: null,
        usesCurrentColor: false,
      };
      restoreNativeCursor();
      el.style.opacity = "0";
      return;
    }

    const latestPointerSnapshot = readPointerSnapshot();
    const preservedPoint = latestPointerSnapshot.point;
    isVisibleRef.current =
      latestPointerSnapshot.isInsideDocument && preservedPoint !== null;

    if (preservedPoint) {
      mouseRef.current = preservedPoint;
      positionRef.current = preservedPoint;
    }

    const forcedVariant = normalizeCursorVariant(variant);

    /*
      hell yeah.
    */
    el.style.transform = "translate(-50%, -50%) translate3d(-200px, -200px, 0)";
    lastTransformRef.current = el.style.transform;
    appliedShapeRef.current = null;
    el.style.opacity = "0";
    el.style.transition = CURSOR_TRANSITION;
    const cursorElement = el;
    let observedTarget: Element | null = null;
    let observedShadowRoot: ShadowRoot | null = null;
    let geometryTracker: GeometryTrackerState = EMPTY_GEOMETRY_TRACKER_STATE;
    const mutationObserverOptions: MutationObserverInit = {
      attributeOldValue: true,
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            targetRefreshPendingRef.current = true;
            ensureAnimationFrame();
          });
    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(handleMutations);
    const shadowMutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(handleMutations);

    function handleMutations(mutations: MutationRecord[]) {
      if (mutations.every(isIgnoredCursorMutation)) return;
      if (!isVisibleRef.current) return;

      detector.invalidatePointerTargetCache();
      targetRefreshPendingRef.current = true;
      ensureAnimationFrame();
    }

    function observeTarget(target: Element | null) {
      if (!resizeObserver || target === observedTarget) return;

      resizeObserver.disconnect();
      observedTarget = target;

      if (target) {
        resizeObserver.observe(target);
      }
    }

    function observeTargetShadowRoot(target: Element | null) {
      const root = target?.getRootNode();
      const shadowRoot =
        typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root : null;
      if (!shadowMutationObserver || shadowRoot === observedShadowRoot) return;

      shadowMutationObserver.disconnect();
      observedShadowRoot = shadowRoot;

      if (shadowRoot) {
        shadowMutationObserver.observe(shadowRoot, mutationObserverOptions);
      }
    }

    function applyShape(shape: CursorShape) {
      const previousShape = appliedShapeRef.current;
      positionRef.current = { x: shape.x, y: shape.y };

      if (!previousShape || previousShape.width !== shape.width) {
        cursorElement.style.width = toPx(shape.width);
      }
      if (!previousShape || previousShape.height !== shape.height) {
        cursorElement.style.height = toPx(shape.height);
      }
      if (!previousShape || previousShape.borderRadius !== shape.borderRadius) {
        cursorElement.style.borderRadius = shape.borderRadius;
      }
      if (!previousShape || previousShape.backgroundColor !== shape.backgroundColor) {
        cursorElement.style.backgroundColor = shape.backgroundColor;
      }
      if (!previousShape || previousShape.border !== shape.border) {
        cursorElement.style.border = shape.border;
      }

      const opacity = isVisibleRef.current ? String(shape.opacity) : "0";
      if (cursorElement.style.opacity !== opacity) {
        cursorElement.style.opacity = opacity;
      }

      baseScaleRef.current = shape.scale;
      appliedShapeRef.current = shape;
    }

    function applyResolvedColor(resolvedColor: string, usesCurrentColor: boolean) {
      const currentPresentation = presentationRef.current;
      if (
        resolvedColor === currentPresentation.color &&
        usesCurrentColor === currentPresentation.usesCurrentColor
      ) {
        return;
      }

      presentationRef.current = {
        ...currentPresentation,
        color: resolvedColor,
        usesCurrentColor,
      };

      if (resolvedColor === currentPresentation.color) return;

      if (currentPresentation.variant === "button") {
        cursorElement.style.borderColor = resolvedColor;
      } else {
        cursorElement.style.backgroundColor = resolvedColor;
      }
    }

    function detectTarget(x: number, y: number, target: Element | null): CursorDetection {
      if (forcedVariant) return { variant: forcedVariant, target, textHeight: null };
      const detection = detector.detect(x, y, target);
      return detection.variant === "default" && !detection.target
        ? { ...detection, target }
        : detection;
    }

    function applyDetection(detection: CursorDetection, force = false) {
      const nextPresentation = resolveCursorPresentation({
        detection,
        point: mouseRef.current,
        color: cursorColor,
        spacing: cursorSpacing,
        offset: cursorOffset,
      });
      const shouldApply = shouldApplyCursorPresentation(
        presentationRef.current,
        nextPresentation,
        force,
      );

      presentationRef.current = nextPresentation;

      if (!shouldApply) {
        if (nextPresentation.variant === "default" && nextPresentation.shape) {
          positionRef.current = {
            x: nextPresentation.shape.x,
            y: nextPresentation.shape.y,
          };
        }

        return;
      }

      if (!nextPresentation.shape) {
        observeTarget(null);
        cursorElement.style.opacity = "0";
        restoreNativeCursor();
        return;
      }

      observeTarget(nextPresentation.tracksTargetGeometry ? nextPresentation.target : null);
      if (nextPresentation.preservesNativeCursor) {
        restoreNativeCursor();
      } else {
        hideNativeCursor();
      }
      applyShape(nextPresentation.shape);
    }

    function applyTarget(x: number, y: number, target: Element | null, force = false) {
      observeTargetShadowRoot(target);
      applyDetection(detectTarget(x, y, target), force);
    }

    function getTargetFromPoint(x: number, y: number): Element | null {
      let target = document.elementFromPoint(x, y);

      while (target?.shadowRoot) {
        const nestedTarget = target.shadowRoot.elementFromPoint(x, y);
        if (!nestedTarget || nestedTarget === target) break;

        target = nestedTarget;
      }

      return target;
    }

    function refreshCurrentTarget(force = false) {
      if (!isVisibleRef.current) return;

      detector.invalidateTextCache();

      const { x, y } = mouseRef.current;
      const target = getTargetFromPoint(x, y);
      applyTarget(x, y, target, force);
    }
    refreshCurrentTargetRef.current = refreshCurrentTarget;

    function refreshCurrentColor() {
      const currentPresentation = presentationRef.current;
      const colorResolution = resolveCursorColor(
        currentPresentation.variant,
        currentPresentation.target,
        cursorColor,
      );

      applyResolvedColor(colorResolution.value, colorResolution.usesCurrentColor);
    }
    refreshCurrentColorRef.current = refreshCurrentColor;

    function refreshMovingTarget() {
      const currentPresentation = presentationRef.current;
      const snapshot = readTargetGeometrySnapshot(
        currentPresentation.variant,
        currentPresentation.target,
        mouseRef.current,
        currentPresentation.usesCurrentColor,
      );
      const transition = transitionGeometryTracker(
        geometryTracker,
        currentPresentation.target,
        currentPresentation.variant,
        snapshot,
      );

      geometryTracker = transition.state;

      if (transition.didMove) {
        refreshCurrentTarget();
      }
    }
    refreshMovingTargetRef.current = refreshMovingTarget;

    function applyPendingPointer(force = false) {
      const { x, y } = mouseRef.current;
      applyTarget(x, y, pointerTargetRef.current, force);
    }
    applyPendingPointerRef.current = applyPendingPointer;

    function handleMouseMove(e: MouseEvent) {
      updatePointerSnapshot({
        type: "move",
        point: { x: e.clientX, y: e.clientY },
      });
      const target = getMouseEventTarget(e);
      const wasVisible = isVisibleRef.current;
      mouseRef.current = { x: e.clientX, y: e.clientY };

      if (!wasVisible) {
        isVisibleRef.current = true;
        forceRefreshPendingRef.current = true;
      }

      pointerTargetRef.current = target;
      pointerRefreshPendingRef.current = true;
      ensureAnimationFrame();
    }

    function handleWheel(e: WheelEvent) {
      scrollVelocityRef.current += e.deltaY;
      ensureAnimationFrame();
    }

    function handleScroll() {
      targetRefreshPendingRef.current = true;
      ensureAnimationFrame();
    }

    function handleResize() {
      detector.invalidatePointerTargetCache();
      targetRefreshPendingRef.current = true;
      ensureAnimationFrame();
    }

    function handleMouseLeave() {
      updatePointerSnapshot({ type: "leave" });
      isVisibleRef.current = false;
      presentationRef.current = {
        ...presentationRef.current,
        target: null,
      };
      observeTargetShadowRoot(null);
      cursorElement.style.opacity = "0";
      restoreNativeCursor();
      pointerRefreshPendingRef.current = false;
      targetRefreshPendingRef.current = false;
      forceRefreshPendingRef.current = false;
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }

    function handleMouseEnter(e: MouseEvent) {
      updatePointerSnapshot({
        type: "enter",
        point: { x: e.clientX, y: e.clientY },
      });
      mouseRef.current = { x: e.clientX, y: e.clientY };
      isVisibleRef.current = true;
      detector.invalidatePointerTargetCache();
      pointerTargetRef.current = getTargetFromPoint(e.clientX, e.clientY);
      pointerRefreshPendingRef.current = true;
      forceRefreshPendingRef.current = true;
      ensureAnimationFrame();
    }

    const initialPresentation = resolveCursorPresentation({
      detection: {
        variant: forcedVariant ?? "default",
        target: null,
        textHeight: null,
      },
      point: positionRef.current,
      color: cursorColor,
      spacing: cursorSpacing,
      offset: cursorOffset,
    });
    presentationRef.current = initialPresentation;
    if (initialPresentation.shape) {
      applyShape(initialPresentation.shape);
    } else {
      cursorElement.style.opacity = "0";
      restoreNativeCursor();
    }
    if (isVisibleRef.current) {
      refreshCurrentTarget(true);
      const transform = getCursorTransform(positionRef.current);
      cursorElement.style.transform = transform;
      lastTransformRef.current = transform;
      ensureAnimationFrame();
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    mutationObserver?.observe(document.documentElement, mutationObserverOptions);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
      refreshCurrentTargetRef.current = null;
      refreshCurrentColorRef.current = null;
      refreshMovingTargetRef.current = null;
      applyPendingPointerRef.current = null;
      pointerRefreshPendingRef.current = false;
      targetRefreshPendingRef.current = false;
      forceRefreshPendingRef.current = false;
      appliedShapeRef.current = null;
      lastTransformRef.current = "";
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      shadowMutationObserver?.disconnect();
    };
  }, [
    detector,
    disabled,
    hideNativeCursor,
    restoreNativeCursor,
    ensureAnimationFrame,
    tick,
    variant,
    cursorColor,
    cursorSpacing,
    cursorOffset,
  ]);

  return { cursorRef };
}
