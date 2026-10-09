import { expect, test } from "vitest";
import { OneOnOneFightController } from "../combat/fight.controller";
import { EncounterWalkController } from "../field/encounters.controller";
import { type Rng, SeededRandomGenerator } from "../rng";
import { RunStatistics } from "./stats.controller";

const rules = {
  turnBase: 100,
  spreadMin: 0.9,
  spreadMax: 1.1,
  critChance: 0.05,
  critMultiplier: 1.5,
  defendMultiplier: 0.5,
  weaknessMultiplier: 1.5,
  resistanceMultiplier: 0.5,
  potionHeal: 25,
  fleeBase: 0.5,
  fleePerPoint: 0.05,
  fleeMin: 0.1,
  fleeMax: 0.9,
};

const hero = { id: "hero", hp: 30, str: 8, def: 4, haste: 8, hero: true };
const slime = { id: "slime", hp: 12, str: 6, def: 2, haste: 5 };

function rolls(values: number[]): Rng {
  let index = 0;
  return {
    next() {
      const value = values[index] ?? 0;
      index += 1;
      return value;
    },
  };
}

test("a walk and a won fight record distance, damage, and the seed", () => {
  const grass = {
    width: 16,
    height: 1,
    tiles: Array.from({ length: 16 }, () => "grass" as const),
  };
  const walked = new EncounterWalkController({
    position: { x: 0.5, y: 0.5 },
    field: grass,
    tables: { grass: { rate: 0, packs: [] } },
    minDistance: 4,
    rng: rolls([]),
  }).holdStick({ x: 64, y: 0 }, 30);
  const events = new OneOnOneFightController({
    ...rules,
    hero,
    enemy: slime,
    rng: new SeededRandomGenerator(1),
  }).resolve();
  const fresh = new RunStatistics(42, 1, "hero");
  expect(fresh.snapshot().distance).toBe(0);

  const stats = new RunStatistics(42, 1, "hero");
  stats.addWalk(walked.distance);
  stats.addFight(events, "mob.slime");

  expect(walked.distance).toBeCloseTo(4, 8);
  expect(stats.snapshot()).toEqual({
    seed: 42,
    fightsWon: 1,
    fightsFled: 0,
    level: 1,
    damageDealt: 17,
    damageTaken: 4,
    potionsUsed: 0,
    distance: walked.distance,
  });
});

test("a drink at full HP counts, a flee counts, and a defeat names the mob", () => {
  const flat = { ...rules, spreadMin: 1, spreadMax: 1, critChance: 0 };
  const drank = new OneOnOneFightController({
    ...flat,
    hero: { ...hero, potions: 1 },
    enemy: slime,
    rng: rolls([]),
    heroActions: ["potion"],
  }).resolve();
  const fled = new OneOnOneFightController({
    ...flat,
    hero,
    enemy: slime,
    rng: rolls([0]),
    heroActions: ["flee"],
  }).resolve();
  const lost = new OneOnOneFightController({
    ...flat,
    hero: { ...hero, hp: 1 },
    enemy: { ...slime, haste: 20 },
    rng: rolls([]),
  }).resolve();

  const run = new RunStatistics(7, 1, "hero");
  run.addFight(drank, "mob.slime");
  const afterDrink = run.snapshot();
  expect(afterDrink.potionsUsed).toBe(1);

  run.addFight(fled, "mob.slime");
  const afterFlee = run.snapshot();
  expect(afterFlee.fightsFled).toBe(1);
  expect(afterFlee.fightsWon).toBe(afterDrink.fightsWon);
  expect(afterFlee.killedBy).toBeUndefined();

  const deadRun = new RunStatistics(7, 1, "hero");
  deadRun.addFight(lost, "mob.slime");
  const dead = deadRun.snapshot();
  expect(dead.killedBy).toBe("mob.slime");
  expect(dead.fightsWon).toBe(0);
  expect(dead.fightsFled).toBe(0);
  expect(dead.level).toBe(1);
  expect(dead.damageTaken).toBe(4);
});

test("a win that pays for a level records the new level", () => {
  const events = new OneOnOneFightController({
    ...rules,
    spreadMin: 1,
    spreadMax: 1,
    critChance: 0,
    hero: { ...hero, xp: 3, mp: 1, maxMp: 10, mag: 6 },
    enemy: { ...slime, hp: 7, xpReward: 3 },
    rng: rolls([]),
    leveling: {
      xpPerLevel: 6,
      levelCap: 10,
      growth: { hp: 6, mp: 2, str: 2, def: 1, mag: 1, haste: 1 },
    },
  }).resolve();
  const run = new RunStatistics(7, 1, "hero");
  run.addFight(events, "mob.slime");
  const stats = run.snapshot();
  expect(stats.level).toBe(2);
  expect(stats.fightsWon).toBe(1);
  expect(stats.damageDealt).toBe(7);
});
