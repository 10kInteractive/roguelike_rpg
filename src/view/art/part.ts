/** One block of a placeholder. `y` and `z` are its center. +z is the way it faces. */
export type ModelPart = {
  /** Width, in tiles. */
  width: number;
  /** Height, in tiles. */
  height: number;
  /** Depth, in tiles. */
  depth: number;
  /** Center, east of the figure's origin. */
  x: number;
  /** Center, up from the ground before hover. */
  y: number;
  /** Center, toward the way the figure faces. */
  z: number;
  /** Block color. */
  color: number;
};

/** One block, centered at `x`, `y`, `z`. */
export function box(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  color: number,
): ModelPart {
  return { width, height, depth, x, y, z, color };
}
