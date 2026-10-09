export type HeroProgress = {
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  str: number;
  def: number;
  mag: number;
  haste: number;
};

export type Growth = {
  hp: number;
  mp: number;
  str: number;
  def: number;
  mag: number;
  haste: number;
};

export type LevelRules = {
  /** XP to leave the current level is this times the level. Prototype one uses 6. */
  xpPerLevel: number;
  /** Highest level. Prototype one uses 10. */
  levelCap: number;
  growth: Growth;
};

export type LevelEvent =
  | { type: "xpGained"; amount: number; xp: number; level: number }
  | {
      type: "levelUp";
      level: number;
      hp: number;
      maxHp: number;
      mp: number;
      maxMp: number;
      str: number;
      def: number;
      mag: number;
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
