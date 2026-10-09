import type { Stick } from "../sim/field/movement.types";

/**
 * The stand-in walk until input lands: east, north, west, south, a full stick
 * each, for `squareSideTicks` sim steps per side.
 */
export const squareWalk: readonly Stick[] = [
  { x: 64, y: 0 },
  { x: 0, y: 64 },
  { x: -64, y: 0 },
  { x: 0, y: -64 },
];

/** Sim steps per side of the square. At 4 tiles per second, 8 steps is just over a tile. */
export const squareSideTicks = 8;
