import type { Point } from "./geometry";

export interface PointerSnapshot {
  readonly point: Point | null;
  readonly isInsideDocument: boolean;
}

export type PointerSnapshotEvent =
  | {
      readonly type: "enter" | "move";
      readonly point: Point;
    }
  | {
      readonly type: "leave";
    };

const EMPTY_POINTER_SNAPSHOT: PointerSnapshot = {
  point: null,
  isInsideDocument: false,
};

let pointerSnapshot = EMPTY_POINTER_SNAPSHOT;

export function transitionPointerSnapshot(
  snapshot: PointerSnapshot,
  event: PointerSnapshotEvent,
): PointerSnapshot {
  if (event.type === "leave") {
    return snapshot.isInsideDocument
      ? { ...snapshot, isInsideDocument: false }
      : snapshot;
  }

  return {
    point: { ...event.point },
    isInsideDocument: true,
  };
}

export function getMouseEventTarget(event: MouseEvent): Element {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
  const target = path.find((item): item is Element => item instanceof Element);
  return target ?? document.body;
}

export function readPointerSnapshot(): PointerSnapshot {
  return pointerSnapshot;
}

export function updatePointerSnapshot(event: PointerSnapshotEvent): PointerSnapshot {
  pointerSnapshot = transitionPointerSnapshot(pointerSnapshot, event);
  return pointerSnapshot;
}
