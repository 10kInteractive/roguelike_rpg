import { expect, test } from "vitest";
import { gainXp, type HeroProgress, type LevelRules } from "./level";

const rules: LevelRules = {
  xpPerLevel: 6,
  levelCap: 10,
  growth: { hp: 6, mp: 2, str: 2, def: 1, mag: 1, haste: 1 },
};

const strider: HeroProgress = {
  level: 1,
  xp: 0,
  hp: 10,
  maxHp: 30,
  mp: 1,
  maxMp: 10,
  str: 8,
  def: 4,
  mag: 6,
  haste: 8,
};

test("6 XP leaves level 1, grows stats, and restores HP and MP", () => {
  const gained = gainXp({ ...strider, xp: 3 }, 3, rules);
  expect(gained.events).toEqual([
    { type: "xpGained", amount: 3, xp: 6, level: 1 },
    {
      type: "levelUp",
      level: 2,
      hp: 36,
      maxHp: 36,
      mp: 12,
      maxMp: 12,
      str: 10,
      def: 5,
      mag: 7,
      haste: 9,
    },
  ]);
  expect(gained.hero.xp).toBe(0);
});

test("40 XP raises three levels and keeps the remainder", () => {
  const gained = gainXp(strider, 40, rules);
  expect(gained.events.map((event) => event.type)).toEqual([
    "xpGained",
    "levelUp",
    "levelUp",
    "levelUp",
  ]);
  expect(gained.hero).toMatchObject({ level: 4, xp: 4, hp: 48, maxHp: 48, str: 14 });
});

test("at the level cap, XP accumulates and stats stay put", () => {
  const capped = { ...strider, level: 10, xp: 0, hp: 30, mp: 10 };
  const gained = gainXp(capped, 100, rules);
  expect(gained.events).toEqual([{ type: "xpGained", amount: 100, xp: 100, level: 10 }]);
  expect(gained.hero).toMatchObject({ level: 10, xp: 100, maxHp: 30, str: 8 });
});
