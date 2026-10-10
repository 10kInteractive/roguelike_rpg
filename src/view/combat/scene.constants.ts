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

/** The circle under the mob the player is choosing. A flat mark. It does not move the mob. */
export const selectionRing = {
  /** Width and depth of the plane, in tiles. */
  size: 0.8,
  /** How high it sits, so it clears the ground. */
  y: 0.02,
  /** Pixel size of the texture. The circle is one pixel thick. */
  pixels: 32,
  /** Warm line, readable on grass and on the forest floor. */
  color: 0xf2d36b,
  /** How solid the line is. The rest of the plane stays clear. */
  alpha: 0.38,
};

/** The idle bob everyone does while waiting: height in tiles, and bobs per second. */
export const idleBob = { height: 0.04, hoverHeight: 0.1, perSecond: 0.8 };

/** Where the combat camera sits, and the point it looks at. */
export const combatCamera = {
  position: { x: -0.2, y: 2.9, z: 5.6 },
  lookAt: { x: -0.2, y: 0.5, z: 0 },
};

/**
 * How far the camera's position drifts on x, in tiles, while a fight is on.
 *
 * The look point stays on the center of the field. The drift runs on its own,
 * not with a swing.
 */
export const combatSway = 0.08;

/** Seconds for one trip to the side and back through the center. */
export const combatSwaySeconds = 12;
