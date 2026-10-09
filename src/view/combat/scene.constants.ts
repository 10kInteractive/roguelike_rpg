/**
 * Where the combat stage puts things, in tiles. The camera looks north from the
 * south, the hero stands east on the right, and the pack stands west on the left.
 */
export const combatStage = {
  /** The hero's spot. */
  hero: { x: 2.2, z: 0.4 },
  /** The front of the pack's line. Later mobs stand behind, further north. */
  pack: { x: -1.8, z: 1.2 },
  /** Gap between mobs in the pack, north to south. */
  packSpacing: 1.2,
  /** Each later mob also stands this much further west, so no one hides another. */
  packStagger: 1,
  /** How far the mob being fought steps out toward the hero. */
  focusStep: 0.7,
};

/** The meadow behind the fight: a grass floor, a tree line, then mountains. */
export const combatBackdrop = {
  /** Width and depth of the grass floor. */
  floorSize: 40,
  /** The tree line: one forest column per tile, from `from` to `to` along x. */
  trees: { z: -4.5, from: -10, to: 10, height: 0.85 },
  /** The mountain row behind the trees. Heights and depth nudges repeat along the row. */
  mountains: {
    z: -8,
    from: -14,
    to: 14,
    heights: [1.8, 2.4, 2.0, 2.9, 1.9, 2.3, 2.6],
    nudges: [0, -0.6, 0.4, -1, 0.2, -0.4, 0.6, -0.8],
  },
};

/** The idle bob everyone does while waiting: height in tiles, and bobs per second. */
export const idleBob = { height: 0.04, hoverHeight: 0.1, perSecond: 0.8 };

/** Where the combat camera sits, and the point it looks at. */
export const combatCamera = {
  position: { x: -0.2, y: 2.9, z: 5.6 },
  lookAt: { x: -0.2, y: 0.5, z: 0 },
};
