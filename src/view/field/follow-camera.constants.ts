/** Where the 3/4 camera sits relative to the hero, in tiles: up, and to the south. */
export const followOffset = { up: 9, south: 8 };

/**
 * How quickly the camera closes the gap to the hero, per second.
 * Each second it covers all but `e^−rate` of the remaining distance.
 */
export const followRate = 5;
