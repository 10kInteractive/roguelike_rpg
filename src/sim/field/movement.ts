export const tickRate = 30;
export const tilesPerSecond = 4;
export const stickLimit = 64;

export type Stick = { x: number; y: number };
export type Position = { x: number; y: number };

/**
 * Steps the hero along a stick vector.
 *
 * The stick is an integer pair from −64 to 64. A full stick moves
 * `tilesPerSecond` tiles per second, and a diagonal press is no faster.
 * `ticks` repeats the same stick. Collision comes later.
 */
export function move(position: Position, stick: Stick, ticks = 1): Position {
  // Keep the stick inside its range, then scale it to a direction of length at most 1.
  const dx = clamp(stick.x, -stickLimit, stickLimit) / stickLimit;
  const dy = clamp(stick.y, -stickLimit, stickLimit) / stickLimit;
  const length = Math.hypot(dx, dy);
  const scale = length > 1 ? 1 / length : 1;

  // One tick at full stick covers walk speed divided by the tick rate.
  const distance = (tilesPerSecond / tickRate) * ticks * scale;
  return {
    x: position.x + dx * distance,
    y: position.y + dy * distance,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
