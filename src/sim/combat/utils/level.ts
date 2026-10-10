import type { HeroProgress, LevelEvent, LevelGain, LevelRules } from "./level.types";

/**
 * Adds XP from a win and raises every level that XP pays for.
 *
 * `xpGained.xp` is the total after the grant, before it is spent on levels.
 * Each level adds the growth, then restores HP and MP to the new maximum.
 * At the level cap, XP still accumulates and no further level is gained.
 */
export function grantExperienceAndRaiseLevels(
  hero: HeroProgress,
  amount: number,
  rules: LevelRules,
): LevelGain {
  const next = { ...hero, xp: hero.xp + amount };
  const events: LevelEvent[] = [{ type: "xpGained", amount, xp: next.xp, level: next.level }];

  // Spend whole levels. Each one costs the same, and one grant can cross several.
  while (next.level < rules.levelCap && next.xp >= rules.xpPerLevel) {
    next.xp -= rules.xpPerLevel;
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
