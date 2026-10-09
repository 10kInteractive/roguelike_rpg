import type { Terrain } from "./map.types";

/**
 * How far the left stick is pushed.
 *
 * The keyboard and the gamepad both become this pair. It is not a position.
 */
export type Stick = {
  /** Horizontal push. −64 is full west, 64 is full east. */
  x: number;
  /** Vertical push. −64 is full south, 64 is full north. */
  y: number;
};

/** Where the hero is standing, in tiles. */
export type Position = {
  /** Tiles east of the origin. */
  x: number;
  /** Tiles north of the origin. */
  y: number;
};

/** The tile grid movement collides with. Tiles are row-major. */
export type FieldGrid = {
  /** Columns. */
  width: number;
  /** Rows. */
  height: number;
  /** Terrain in row-major order, `y * width + x`. */
  tiles: readonly Terrain[];
};
