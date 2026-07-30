export function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

export function durationToFactor(durationSeconds: number, fps = 60): number {
  return 1 - Math.exp(-(1 / (durationSeconds * fps)) * 6);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
