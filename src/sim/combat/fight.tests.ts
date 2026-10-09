import { expect, test } from "vitest";
import { SeededRandomGenerator } from "../utils/rng.controller";
import type { Rng } from "../utils/rng.types";
import { OneOnOneFightController } from "./fight.controller";
import type { FightEvent } from "./fight.types";
import { CombatActionPolicy } from "./policy.controller";
import type { KnownSpell } from "./policy.types";

const hero = { id: "hero", hp: 30, str: 8, def: 4, haste: 8, hero: true };
const slime = { id: "slime", hp: 12, str: 6, def: 2, haste: 5 };

function heroVersusSlime(rng: Rng): FightEvent[] {
  return new OneOnOneFightController({
    hero,
    enemy: slime,
    rng,
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
  }).resolve();
}

function scripted(values: number[]): Rng {
  let index = 0;
  return {
    next() {
      const value = values[index] ?? 0;
      index += 1;
      return value;
    },
  };
}

test("a roll below 5% crits and a roll of 5% does not", () => {
  const crit = heroVersusSlime(scripted([0, 0]));
  const plain = heroVersusSlime(scripted([0, 0.05]));
  expect(crit[1]).toEqual({
    type: "damaged",
    actorId: "hero",
    targetId: "slime",
    amount: 9,
    targetHp: 3,
    critical: true,
  });
  expect(plain[1]).toMatchObject({ amount: 6, critical: false });
});

test("a hero and a slime trade hits until the slime reaches zero", () => {
  expect(heroVersusSlime(new SeededRandomGenerator(1))).toEqual([
    { type: "attacked", actorId: "hero", targetId: "slime" },
    {
      type: "damaged",
      actorId: "hero",
      targetId: "slime",
      amount: 10,
      targetHp: 2,
      critical: true,
    },
    { type: "attacked", actorId: "slime", targetId: "hero" },
    {
      type: "damaged",
      actorId: "slime",
      targetId: "hero",
      amount: 4,
      targetHp: 26,
      critical: false,
    },
    { type: "attacked", actorId: "hero", targetId: "slime" },
    {
      type: "damaged",
      actorId: "hero",
      targetId: "slime",
      amount: 7,
      targetHp: 0,
      critical: false,
    },
    { type: "actorDefeated", actorId: "slime" },
  ]);
});

test("the same seed plays the same fight", () => {
  expect(heroVersusSlime(new SeededRandomGenerator(1))).toEqual(
    heroVersusSlime(new SeededRandomGenerator(1)),
  );
});

test("defend halves the next hit and ends on that actor's next turn", () => {
  const events = new OneOnOneFightController({
    hero,
    enemy: slime,
    rng: scripted([]),
    turnBase: 100,
    spreadMin: 1,
    spreadMax: 1,
    critChance: 0,
    critMultiplier: 1.5,
    defendMultiplier: 0.5,
    weaknessMultiplier: 1.5,
    resistanceMultiplier: 0.5,
    potionHeal: 25,
    fleeBase: 0.5,
    fleePerPoint: 0.05,
    fleeMin: 0.1,
    fleeMax: 0.9,
    heroActions: ["defend"],
  }).resolve();
  expect(events.slice(0, 7)).toEqual([
    { type: "defended", actorId: "hero" },
    { type: "attacked", actorId: "slime", targetId: "hero" },
    {
      type: "damaged",
      actorId: "slime",
      targetId: "hero",
      amount: 2,
      targetHp: 28,
      critical: false,
    },
    { type: "attacked", actorId: "hero", targetId: "slime" },
    {
      type: "damaged",
      actorId: "hero",
      targetId: "slime",
      amount: 7,
      targetHp: 5,
      critical: false,
    },
    { type: "attacked", actorId: "slime", targetId: "hero" },
    {
      type: "damaged",
      actorId: "slime",
      targetId: "hero",
      amount: 4,
      targetHp: 24,
      critical: false,
    },
  ]);
});

test("a crit is halved while the target is defending", () => {
  const events = new OneOnOneFightController({
    hero,
    enemy: slime,
    rng: scripted([]),
    turnBase: 100,
    spreadMin: 1,
    spreadMax: 1,
    critChance: 1,
    critMultiplier: 1.5,
    defendMultiplier: 0.5,
    weaknessMultiplier: 1.5,
    resistanceMultiplier: 0.5,
    potionHeal: 25,
    fleeBase: 0.5,
    fleePerPoint: 0.05,
    fleeMin: 0.1,
    fleeMax: 0.9,
    heroActions: ["defend"],
  }).resolve();
  expect(events[2]).toEqual({
    type: "damaged",
    actorId: "slime",
    targetId: "hero",
    amount: 3,
    targetHp: 27,
    critical: true,
  });
});

test("a potion heals, spends the turn, and stops at maximum HP", () => {
  const events = new OneOnOneFightController({
    hero: { ...hero, hp: 5, maxHp: 30, potions: 2 },
    enemy: slime,
    rng: scripted([]),
    turnBase: 100,
    spreadMin: 1,
    spreadMax: 1,
    critChance: 0,
    critMultiplier: 1.5,
    defendMultiplier: 0.5,
    weaknessMultiplier: 1.5,
    resistanceMultiplier: 0.5,
    potionHeal: 25,
    fleeBase: 0.5,
    fleePerPoint: 0.05,
    fleeMin: 0.1,
    fleeMax: 0.9,
    heroActions: ["potion", "potion"],
  }).resolve();
  expect(events.slice(0, 4)).toEqual([
    {
      type: "itemUsed",
      actorId: "hero",
      itemId: "item.potion",
      amount: 25,
      hp: 30,
      remaining: 1,
    },
    { type: "attacked", actorId: "slime", targetId: "hero" },
    {
      type: "damaged",
      actorId: "slime",
      targetId: "hero",
      amount: 4,
      targetHp: 26,
      critical: false,
    },
    {
      type: "itemUsed",
      actorId: "hero",
      itemId: "item.potion",
      amount: 4,
      hp: 30,
      remaining: 0,
    },
  ]);
});

test("a potion at full HP is spent and restores nothing", () => {
  const events = new OneOnOneFightController({
    hero: { ...hero, potions: 1 },
    enemy: slime,
    rng: scripted([]),
    turnBase: 100,
    spreadMin: 1,
    spreadMax: 1,
    critChance: 0,
    critMultiplier: 1.5,
    defendMultiplier: 0.5,
    weaknessMultiplier: 1.5,
    resistanceMultiplier: 0.5,
    potionHeal: 25,
    fleeBase: 0.5,
    fleePerPoint: 0.05,
    fleeMin: 0.1,
    fleeMax: 0.9,
    heroActions: ["potion"],
  }).resolve();
  expect(events[0]).toEqual({
    type: "itemUsed",
    actorId: "hero",
    itemId: "item.potion",
    amount: 0,
    hp: 30,
    remaining: 0,
  });
});

test("a potion with none left spends the turn and restores nothing", () => {
  const events = new OneOnOneFightController({
    hero: { ...hero, hp: 5, maxHp: 30, potions: 0 },
    enemy: slime,
    rng: scripted([]),
    turnBase: 100,
    spreadMin: 1,
    spreadMax: 1,
    critChance: 0,
    critMultiplier: 1.5,
    defendMultiplier: 0.5,
    weaknessMultiplier: 1.5,
    resistanceMultiplier: 0.5,
    potionHeal: 25,
    fleeBase: 0.5,
    fleePerPoint: 0.05,
    fleeMin: 0.1,
    fleeMax: 0.9,
    heroActions: ["potion"],
  }).resolve();
  expect(events.slice(0, 2)).toEqual([
    {
      type: "itemUsed",
      actorId: "hero",
      itemId: "item.potion",
      amount: 0,
      hp: 5,
      remaining: 0,
    },
    { type: "attacked", actorId: "slime", targetId: "hero" },
  ]);
});

const fleeRules = {
  turnBase: 100,
  spreadMin: 1,
  spreadMax: 1,
  critChance: 0,
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

test("a roll below the flee chance escapes and a roll of the chance does not", () => {
  const fled = new OneOnOneFightController({
    ...fleeRules,
    hero,
    enemy: slime,
    rng: scripted([0]),
    heroActions: ["flee"],
  }).resolve();
  const stayed = new OneOnOneFightController({
    ...fleeRules,
    hero,
    enemy: slime,
    rng: scripted([0.65]),
    heroActions: ["flee"],
  }).resolve();
  expect(fled).toEqual([{ type: "fleeAttempted", actorId: "hero", success: true, chance: 0.65 }]);
  expect(stayed.slice(0, 2)).toEqual([
    { type: "fleeAttempted", actorId: "hero", success: false, chance: 0.65 },
    { type: "attacked", actorId: "slime", targetId: "hero" },
  ]);
});

test("flee chance stays between 10% and 90%", () => {
  const capped = new OneOnOneFightController({
    ...fleeRules,
    hero: { ...hero, haste: 30 },
    enemy: slime,
    rng: scripted([0.9]),
    heroActions: ["flee"],
  }).resolve();
  const floored = new OneOnOneFightController({
    ...fleeRules,
    hero: { ...hero, haste: 1 },
    enemy: { ...slime, haste: 20, str: 1 },
    rng: scripted([0, 0, 0.09]),
    heroActions: ["flee"],
  }).resolve();
  expect(capped[0]).toEqual({
    type: "fleeAttempted",
    actorId: "hero",
    success: false,
    chance: 0.9,
  });
  expect(floored[2]).toEqual({
    type: "fleeAttempted",
    actorId: "hero",
    success: true,
    chance: 0.1,
  });
});

test("a miniboss cannot be fled, and the attempt does not roll", () => {
  const events = new OneOnOneFightController({
    ...fleeRules,
    hero,
    enemy: { ...slime, miniboss: true },
    rng: scripted([0, 0.5]),
    spreadMin: 0.9,
    spreadMax: 1.1,
    critChance: 0.05,
    heroActions: ["flee"],
  }).resolve();
  expect(events.slice(0, 3)).toEqual([
    { type: "fleeAttempted", actorId: "hero", success: false, chance: 0 },
    { type: "attacked", actorId: "slime", targetId: "hero" },
    {
      type: "damaged",
      actorId: "slime",
      targetId: "hero",
      amount: 3,
      targetHp: 27,
      critical: false,
    },
  ]);
});

const ember = {
  type: "spell" as const,
  spellId: "spell.ember" as const,
  element: "fire" as const,
  power: 8,
  cost: 3,
  weight: 40,
};

const imp = {
  id: "imp",
  hp: 14,
  str: 6,
  def: 3,
  mag: 6,
  mp: 3,
  haste: 9,
  actions: [{ type: "fight" as const, weight: 60 }, ember],
};

test("an enemy rolls its action list, so 60/40 is attack then ember", () => {
  const attack = new OneOnOneFightController({
    ...fleeRules,
    hero,
    enemy: imp,
    rng: scripted([0]),
  }).resolve();
  const cast = new OneOnOneFightController({
    ...fleeRules,
    hero,
    enemy: imp,
    rng: scripted([0.6]),
  }).resolve();
  expect(attack[0]).toEqual({ type: "attacked", actorId: "imp", targetId: "hero" });
  expect(cast.slice(0, 2)).toEqual([
    { type: "spellCast", actorId: "imp", spellId: "spell.ember", targetId: "hero", mp: 0 },
    {
      type: "damaged",
      actorId: "imp",
      targetId: "hero",
      amount: 14,
      targetHp: 16,
      critical: false,
    },
  ]);
});

test("an ember the enemy cannot afford is a fight instead", () => {
  const events = new OneOnOneFightController({
    ...fleeRules,
    hero,
    enemy: imp,
    rng: scripted([0.6, 0, 0.6, 0, 0]),
    heroActions: ["potion"],
  }).resolve();
  expect(events.slice(0, 5)).toEqual([
    { type: "spellCast", actorId: "imp", spellId: "spell.ember", targetId: "hero", mp: 0 },
    {
      type: "damaged",
      actorId: "imp",
      targetId: "hero",
      amount: 14,
      targetHp: 16,
      critical: false,
    },
    { type: "itemUsed", actorId: "hero", itemId: "item.potion", amount: 0, hp: 16, remaining: 0 },
    { type: "attacked", actorId: "imp", targetId: "hero" },
    {
      type: "damaged",
      actorId: "imp",
      targetId: "hero",
      amount: 4,
      targetHp: 12,
      critical: false,
    },
  ]);
});

const leveling = {
  xpPerLevel: 6,
  levelCap: 10,
  growth: { hp: 6, mp: 2, str: 2, def: 1, mag: 1, haste: 1 },
};

test("a win grants XP, and 6 XP raises a level", () => {
  const events = new OneOnOneFightController({
    ...fleeRules,
    hero: { ...hero, xp: 3, mp: 1, maxMp: 10, mag: 6 },
    enemy: { ...slime, hp: 7, xpReward: 3 },
    rng: scripted([]),
    leveling,
  }).resolve();
  expect(events).toEqual([
    { type: "attacked", actorId: "hero", targetId: "slime" },
    {
      type: "damaged",
      actorId: "hero",
      targetId: "slime",
      amount: 7,
      targetHp: 0,
      critical: false,
    },
    { type: "actorDefeated", actorId: "slime" },
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
});

test("a hero's defeat ends the fight and grants no XP", () => {
  const events = new OneOnOneFightController({
    ...fleeRules,
    hero: { ...hero, hp: 1, xp: 3 },
    enemy: { ...slime, haste: 20, xpReward: 3 },
    rng: scripted([]),
    leveling,
  }).resolve();
  expect(events).toEqual([
    { type: "attacked", actorId: "slime", targetId: "hero" },
    {
      type: "damaged",
      actorId: "slime",
      targetId: "hero",
      amount: 4,
      targetHp: 0,
      critical: false,
    },
    { type: "actorDefeated", actorId: "hero" },
  ]);
});

test("defend halves a spell", () => {
  const events = new OneOnOneFightController({
    ...fleeRules,
    hero: { ...hero, haste: 12 },
    enemy: imp,
    rng: scripted([0.6]),
    heroActions: ["defend"],
  }).resolve();
  expect(events.slice(0, 3)).toEqual([
    { type: "defended", actorId: "hero" },
    { type: "spellCast", actorId: "imp", spellId: "spell.ember", targetId: "hero", mp: 0 },
    {
      type: "damaged",
      actorId: "imp",
      targetId: "hero",
      amount: 7,
      targetHp: 23,
      critical: false,
    },
  ]);
});

test("grind multiplies the hit by 1.5 after a crit", () => {
  const sentinel = {
    id: "sentinel",
    hp: 90,
    str: 6,
    def: 8,
    haste: 20,
    actions: [{ type: "grind" as const, multiplier: 1.5, weight: 1 }],
  };
  const plain = new OneOnOneFightController({
    ...fleeRules,
    hero,
    enemy: sentinel,
    rng: scripted([]),
  }).resolve();
  const crit = new OneOnOneFightController({
    ...fleeRules,
    hero,
    enemy: sentinel,
    rng: scripted([]),
    critChance: 1,
  }).resolve();
  expect(plain.slice(0, 2)).toEqual([
    { type: "grind", actorId: "sentinel", targetId: "hero", multiplier: 1.5 },
    {
      type: "damaged",
      actorId: "sentinel",
      targetId: "hero",
      amount: 6,
      targetHp: 24,
      critical: false,
    },
  ]);
  expect(crit[1]).toMatchObject({ amount: 9, critical: true });
});

test("the fighter drinks below 30% HP, then fights once healed", () => {
  const events = new OneOnOneFightController({
    ...fleeRules,
    hero: { ...hero, hp: 8, maxHp: 30, potions: 1 },
    enemy: slime,
    rng: scripted([]),
    heroPolicy: (actor) => new CombatActionPolicy([], scripted([])).chooseFighter(actor),
  }).resolve();
  expect(events.slice(0, 4)).toEqual([
    { type: "itemUsed", actorId: "hero", itemId: "item.potion", amount: 22, hp: 30, remaining: 0 },
    { type: "attacked", actorId: "slime", targetId: "hero" },
    {
      type: "damaged",
      actorId: "slime",
      targetId: "hero",
      amount: 4,
      targetHp: 26,
      critical: false,
    },
    { type: "attacked", actorId: "hero", targetId: "slime" },
  ]);
});

const spells: KnownSpell[] = [
  { id: "spell.ember", element: "fire", power: 8, cost: 3 },
  { id: "spell.frost", element: "ice", power: 8, cost: 3 },
];

test("the caster throws Frost at an ice weakness, then fights when MP is short", () => {
  const events = new OneOnOneFightController({
    ...fleeRules,
    hero: { ...hero, mp: 4, mag: 6 },
    enemy: { ...slime, hp: 40, weak: "ice" },
    rng: scripted([]),
    heroPolicy: (actor, target) =>
      new CombatActionPolicy(spells, scripted([])).chooseCaster(actor, target),
  }).resolve();
  expect(events.slice(0, 6)).toEqual([
    { type: "spellCast", actorId: "hero", spellId: "spell.frost", targetId: "slime", mp: 1 },
    {
      type: "damaged",
      actorId: "hero",
      targetId: "slime",
      amount: 21,
      targetHp: 19,
      critical: false,
    },
    { type: "attacked", actorId: "slime", targetId: "hero" },
    {
      type: "damaged",
      actorId: "slime",
      targetId: "hero",
      amount: 4,
      targetHp: 26,
      critical: false,
    },
    { type: "attacked", actorId: "hero", targetId: "slime" },
    {
      type: "damaged",
      actorId: "hero",
      targetId: "slime",
      amount: 7,
      targetHp: 12,
      critical: false,
    },
  ]);
});

test("a random policy finishes a fight, including one it cannot flee", () => {
  for (const seed of [1, 2, 42]) {
    const rng = new SeededRandomGenerator(seed);
    const events = new OneOnOneFightController({
      ...fleeRules,
      hero: { ...hero, mp: 10, mag: 6, potions: 3 },
      enemy: slime,
      rng,
      heroPolicy: (actor) => new CombatActionPolicy(spells, rng).chooseRandom(actor),
    }).resolve();
    expect(fightEnded(events)).toBe(true);
  }

  const rng = new SeededRandomGenerator(7);
  const events = new OneOnOneFightController({
    ...fleeRules,
    hero: { ...hero, mp: 10, mag: 6, potions: 1 },
    enemy: { ...slime, hp: 30, miniboss: true },
    rng,
    heroPolicy: (actor) => new CombatActionPolicy(spells, rng).chooseRandom(actor),
  }).resolve();
  expect(events.some((event) => event.type === "fleeAttempted" && event.success)).toBe(false);
  expect(fightEnded(events)).toBe(true);
});

function fightEnded(events: FightEvent[]): boolean {
  return events.some(
    (event) => event.type === "actorDefeated" || (event.type === "fleeAttempted" && event.success),
  );
}
