import { isWalkable } from "./map";
import { heroRadius, stickLimit, tickRate, tilesPerSecond } from "./movement.constants";
import type { FieldGrid, Position, Stick } from "./movement.types";

/**
 * Steps the hero along a stick vector.
 *
 * The stick is an integer pair from −64 to 64. A full stick moves
 * `tilesPerSecond` tiles per second, and a diagonal press is no faster.
 * `ticks` repeats the same stick. With a map, the hero is a circle that
 * slides along blocked tiles instead of entering them.
 */
export function move(position: Position, stick: Stick, ticks = 1, field?: FieldGrid): Position {
  const step = tickStep(stick);
  if (!field) {
    return { x: position.x + step.x * ticks, y: position.y + step.y * ticks };
  }

  // One tick at a time, so a long press cannot skip through a wall.
  let current = position;
  for (let tick = 0; tick < ticks; tick++) current = slide(current, step, field);
  return current;
}

/** How far one tick of this stick moves the hero, before walls. */
function tickStep(stick: Stick): Position {
  // Keep the stick inside its range, then scale it to a direction of length at most 1.
  const dx = clamp(stick.x, -stickLimit, stickLimit) / stickLimit;
  const dy = clamp(stick.y, -stickLimit, stickLimit) / stickLimit;
  const length = Math.hypot(dx, dy);
  const scale = length > 1 ? 1 / length : 1;
  const distance = (tilesPerSecond / tickRate) * scale;
  return { x: dx * distance, y: dy * distance };
}

/** One tick that slides along a blocked edge instead of entering it. */
function slide(position: Position, step: Position, field: FieldGrid): Position {
  const ahead = { x: position.x + step.x, y: position.y + step.y };
  if (!hitsBlocked(ahead, field)) return ahead;

  // The blocked axis drops. The free axis carries the hero along the edge.
  const alongX = { x: ahead.x, y: position.y };
  if (!hitsBlocked(alongX, field)) return alongX;
  const alongY = { x: position.x, y: ahead.y };
  if (!hitsBlocked(alongY, field)) return alongY;
  return position;
}

/** True when the hero's circle overlaps water, mountain, or the ground outside the map. */
function hitsBlocked(position: Position, field: FieldGrid): boolean {
  const x0 = Math.floor(position.x - heroRadius);
  const x1 = Math.floor(position.x + heroRadius);
  const y0 = Math.floor(position.y - heroRadius);
  const y1 = Math.floor(position.y + heroRadius);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!isBlocked(field, x, y)) continue;
      if (circleHitsTile(position, x, y)) return true;
    }
  }
  return false;
}

/** True when this tile index is water, mountain, or off the map. */
function isBlocked(field: FieldGrid, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= field.width || y >= field.height) return true;
  const terrain = field.tiles[y * field.width + x];
  return terrain === undefined || !isWalkable(terrain);
}

/** True when the hero's circle overlaps the tile's square. Touching the edge does not count. */
function circleHitsTile(position: Position, tileX: number, tileY: number): boolean {
  const closestX = clamp(position.x, tileX, tileX + 1);
  const closestY = clamp(position.y, tileY, tileY + 1);
  const dx = position.x - closestX;
  const dy = position.y - closestY;
  return dx * dx + dy * dy < heroRadius * heroRadius;
}

/** Pulls a stick axis or a circle test back inside its range. */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
