/**
 * Where the combat stage puts things, in tiles. The camera looks north from the
 * south, and the hero stands on the east, facing the pack.
 *
 * One mob stands nearer the hero. Up to two stand just west of it, one to
 * either side. The pack centers about a third of the way across the field,
 * and the hero stands about two thirds of the way across.
 */
export const combatStage = {
  /** The hero's spot, about 70% of the way across the field. The near mob shares this depth. */
  hero: { x: 1.4, z: 0 },
  /** The near mob. The far pair stands just west of this, so the pack centers near 30%. */
  pack: { x: -1.5, z: 0 },
  /** How many mobs stand nearer the hero. The rest stand further west. */
  frontCount: 1,
  /** How many mobs stand further from the hero. A pack is at most front plus this. */
  backCount: 2,
  /** How far west the far mobs stand from the near mob. */
  rowGap: 0.6,
  /** North-south gap between the two far mobs. The near mob sits halfway between them. */
  fileGap: 1.8,
  /** How far the mob being fought steps east, toward the hero. */
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
