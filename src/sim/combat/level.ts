/** The hero's level, XP, and stats while a win is being applied. */
export type HeroProgress = {
  /** Current level. Prototype one starts at 1 and caps at 10. */
  level: number;
  /** XP toward the next level, after earlier levels have been paid for. */
  xp: number;
  /** Hit points right now. */
  hp: number;
  /** Hit points a heal or a level-up fills to. */
  maxHp: number;
  /** Magic points right now. */
  mp: number;
  /** Magic points a level-up fills to. */
  maxMp: number;
  /** Strength. Physical damage starts here. */
  str: number;
  /** Defense. Physical damage subtracts half of this. */
  def: number;
  /** Magic. Spell damage adds this. */
  mag: number;
  /** How quickly the hero's turn comes back around. */
  haste: number;
};

/** Stats added each time the hero gains a level. */
export type Growth = {
  /** Hit points added to the maximum. */
  hp: number;
  /** Magic points added to the maximum. */
  mp: number;
  /** Strength added. */
  str: number;
  /** Defense added. */
  def: number;
  /** Magic added. */
  mag: number;
  /** Haste added. */
  haste: number;
};

export type LevelRules = {
  /** XP to leave the current level is this times the level. Prototype one uses 6. */
  xpPerLevel: number;
  /** Highest level. Prototype one uses 10. */
  levelCap: number;
  /** Stats added each level. */
  growth: Growth;
};

/** XP from a win, and each level that XP pays for. */
export type LevelEvent =
  | {
      /** The win's XP landed. Levels have not been spent yet. */
      type: "xpGained";
      /** XP this win granted. */
      amount: number;
      /** Total XP after the grant, before it is spent on levels. */
      xp: number;
      /** Level before any level this grant pays for. */
      level: number;
    }
  | {
      /** The hero gained a level. HP and MP are refilled. */
      type: "levelUp";
      /** The level just reached. */
      level: number;
      /** Hit points after the refill. */
      hp: number;
      /** New maximum hit points. */
      maxHp: number;
      /** Magic points after the refill. */
      mp: number;
      /** New maximum magic points. */
      maxMp: number;
      /** Strength after the growth. */
      str: number;
      /** Defense after the growth. */
      def: number;
      /** Magic after the growth. */
      mag: number;
      /** Haste after the growth. */
      haste: number;
    };

/**
 * Adds XP from a win and raises every level that XP pays for.
 *
 * `xpGained.xp` is the total after the grant, before it is spent on levels.
 * Each level adds the growth, then restores HP and MP to the new maximum.
 * At the level cap, XP still accumulates and no further level is gained.
 */
export function gainXp(
  hero: HeroProgress,
  amount: number,
  rules: LevelRules,
): { hero: HeroProgress; events: LevelEvent[] } {
  const next = { ...hero, xp: hero.xp + amount };
  const events: LevelEvent[] = [{ type: "xpGained", amount, xp: next.xp, level: next.level }];

  // Spend whole levels. One grant can cross several thresholds.
  while (next.level < rules.levelCap && next.xp >= rules.xpPerLevel * next.level) {
    next.xp -= rules.xpPerLevel * next.level;
    next.level += 1;
    next.maxHp += rules.growth.hp;
    next.maxMp += rules.growth.mp;
    next.str += rules.growth.str;
    next.def += rules.growth.def;
    next.mag += rules.growth.mag;
    next.haste += rules.growth.haste;
    next.hp = next.maxHp;
    next.mp = next.maxMp;
    events.push({
      type: "levelUp",
      level: next.level,
      hp: next.hp,
      maxHp: next.maxHp,
      mp: next.mp,
      maxMp: next.maxMp,
      str: next.str,
      def: next.def,
      mag: next.mag,
      haste: next.haste,
    });
  }

  return { hero: next, events };
}
