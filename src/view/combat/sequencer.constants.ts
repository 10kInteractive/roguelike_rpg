/** How long each beat of a fight takes on screen, in seconds. */
export const beatSeconds = {
  /** Out to the target and back. */
  lunge: 0.32,
  /** A grind's wind-up before its bigger lunge. */
  windUp: 0.25,
  /** A spell caster's hop. */
  cast: 0.3,
  /** A tint fading back to normal. */
  flash: 0.25,
  /** Wait after a hit lands, while its number rises. */
  afterHit: 0.35,
  /** A guard or a drink. */
  hop: 0.25,
  /** Fading and sinking out on defeat. */
  defeat: 0.6,
  /** Running off the stage after a flee. */
  flee: 0.5,
};

/** How far things move, in tiles. */
export const beatDistance = {
  /** A normal swing's reach toward the target. */
  lunge: 0.8,
  /** A grind's reach. */
  grindLunge: 1.2,
  /** Hop height for a cast, a guard, or a drink. */
  hop: 0.25,
  /** How far a defeated actor sinks. */
  sink: 0.4,
  /** How far the hero runs on a flee. */
  flee: 3,
};

/** Tints a flash adds, as emissive colors. */
export const flashColors = {
  hit: 0xffffff,
  windUp: 0xff4020,
  guard: 0x4080ff,
  heal: 0x30ff60,
  level: 0xffd23f,
  "spell.ember": 0xff7a2a,
  "spell.frost": 0x7ad0ff,
};
