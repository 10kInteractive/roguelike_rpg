import type { TilePoint } from "./map";
import { type Stick, stickLimit } from "./movement";

/** How many ticks a walking policy holds one stick. Thirty ticks is one second. */
export const stickHoldTicks = 30;

/** The grinder heads for the miniboss once the hero reaches this level. */
export const grinderTargetLevel = 5;

/** The eight wander directions. Roll 0 is east, then counterclockwise. */
export const wanderDirections: readonly Stick[] = [
  { x: stickLimit, y: 0 },
  { x: stickLimit, y: stickLimit },
  { x: 0, y: stickLimit },
  { x: -stickLimit, y: stickLimit },
  { x: -stickLimit, y: 0 },
  { x: -stickLimit, y: -stickLimit },
  { x: 0, y: -stickLimit },
  { x: stickLimit, y: -stickLimit },
];

/** The four tiles a path may step to: east, north, west, then south. */
export const pathNeighbors: readonly TilePoint[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
