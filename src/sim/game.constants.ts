import { stickLimit } from "./field/movement.constants";

/** How many names a combat snapshot lists, the actor whose turn it is first. */
export const turnOrderCount = 8;

/** The hero faces south until the stick is pushed. South is −y. */
export const startingFacing = { x: 0, y: -stickLimit } as const;
