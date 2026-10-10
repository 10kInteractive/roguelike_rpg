/** The asset id of the dark brown floor under a forest fight. */
export const forestFloorTextureId = "combat.forest.floor";

/** The asset id of the dark green trees around a forest fight. */
export const forestWallTextureId = "combat.forest.wall";

/** Flat color for the floor when its texture is missing. */
export const forestFloorFallback = 0x3a2212;

/** Flat color for the trees when their texture is missing. */
export const forestWallFallback = 0x102014;

/**
 * A deep forest around a fight: a dark floor and tall trees, close in.
 *
 * The rows stand behind the pack. The side trees frame the stage without
 * covering the hero or the mob being fought. Logs and roots sit on the near ground.
 */
export const forestBackdrop = {
  /** Width and depth of the dark floor. */
  floorSize: 40,
  /** Sky behind the canopy. Dark, so the clearing reads as shade. */
  sky: 0x1a2420,
  /** Logs and roots on the near ground, off to either side of the fighters. */
  near: [
    { x: -3.3, z: 2.35, width: 2.2, height: 0.36, depth: 0.45, kind: "log" },
    { x: 3.1, z: 1.7, width: 0.75, height: 0.9, depth: 0.7, kind: "root" },
    { x: -4.2, z: 1.55, width: 0.65, height: 0.75, depth: 0.6, kind: "root" },
  ],
  /** Tree rows north of the stage. Heights repeat along the row. */
  rows: [
    { z: -3.2, from: -7, to: 7, heights: [3.4, 4.6, 3.8, 5.2, 4.1, 3.6, 4.8] },
    { z: -5.4, from: -8, to: 8, heights: [4.2, 5.4, 4.8, 6.0, 4.4, 5.0] },
  ],
  /** Trees to the west and east of the stage. */
  sides: [
    { x: -5.5, z: 0.2, height: 3.6 },
    { x: -5.2, z: -1.4, height: 4.4 },
    { x: 5.2, z: 0.4, height: 3.8 },
    { x: 5.5, z: -1.2, height: 4.6 },
  ],
};
