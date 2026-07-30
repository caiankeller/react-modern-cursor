import { NATIVE_CURSOR_HIDDEN_CLASS_NAME } from "../constants";

let hiddenCursorOwners: ReadonlySet<symbol> = new Set();

function transitionHiddenCursorOwners(
  owners: ReadonlySet<symbol>,
  owner: symbol,
  hidden: boolean,
): ReadonlySet<symbol> {
  if (owners.has(owner) === hidden) return owners;

  const nextOwners = new Set(owners);

  if (hidden) {
    nextOwners.add(owner);
  } else {
    nextOwners.delete(owner);
  }

  return nextOwners;
}

function syncNativeCursorVisibility(hidden: boolean): void {
  document.documentElement.classList.toggle(
    NATIVE_CURSOR_HIDDEN_CLASS_NAME,
    hidden,
  );
}

export function setNativeCursorHidden(owner: symbol, hidden: boolean): void {
  const nextOwners = transitionHiddenCursorOwners(hiddenCursorOwners, owner, hidden);
  if (nextOwners === hiddenCursorOwners) return;

  hiddenCursorOwners = nextOwners;
  syncNativeCursorVisibility(hiddenCursorOwners.size > 0);
}

export function readWithNativeCursorVisible<Value>(read: () => Value): Value {
  const root = document.documentElement;
  const wasHidden = root.classList.contains(NATIVE_CURSOR_HIDDEN_CLASS_NAME);
  if (!wasHidden) return read();

  root.classList.remove(NATIVE_CURSOR_HIDDEN_CLASS_NAME);

  try {
    return read();
  } finally {
    root.classList.add(NATIVE_CURSOR_HIDDEN_CLASS_NAME);
  }
}
