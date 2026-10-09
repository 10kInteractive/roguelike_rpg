import { stickLimit } from "../sim/field/movement.constants";
import type { Stick } from "../sim/field/movement.types";

/** A full press on each held direction. Opposite keys cancel. Up is north, +y. */
export function stickFromHeld(codes: readonly string[]): Stick {
  const held = new Set(codes);
  let x = 0;
  let y = 0;
  if (held.has("ArrowRight") || held.has("KeyD")) x += stickLimit;
  if (held.has("ArrowLeft") || held.has("KeyA")) x -= stickLimit;
  if (held.has("ArrowUp") || held.has("KeyW")) y += stickLimit;
  if (held.has("ArrowDown") || held.has("KeyS")) y -= stickLimit;
  return { x, y };
}
