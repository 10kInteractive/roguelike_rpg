import { expect, test } from "vitest";
import { type FightEvent, fight } from "./fight";
import type { Rng } from "./rng";
import { createRng } from "./rng";

const hero = { id: "hero", hp: 30, str: 8, def: 4, haste: 8, hero: true };
const slime = { id: "slime", hp: 12, str: 6, def: 2, haste: 5 };

function heroVersusSlime(rng: Rng): FightEvent[] {
  return fight({
    hero,
    enemy: slime,
    rng,
    turnBase: 100,
    spreadMin: 0.9,
    spreadMax: 1.1,
    critChance: 0.05,
    critMultiplier: 1.5,
    defendMultiplier: 0.5,
    potionHeal: 25,
    fleeBase: 0.5,
    fleePerPoint: 0.05,
    fleeMin: 0.1,
    fleeMax: 0.9,
  });
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
  expect(heroVersusSlime(createRng(1))).toEqual([
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
  ]);
});

test("the same seed plays the same fight", () => {
  expect(heroVersusSlime(createRng(1))).toEqual(heroVersusSlime(createRng(1)));
});

test("defend halves the next hit and ends on that actor's next turn", () => {
  const events = fight({
    hero,
    enemy: slime,
    rng: scripted([]),
    turnBase: 100,
    spreadMin: 1,
    spreadMax: 1,
    critChance: 0,
    critMultiplier: 1.5,
    defendMultiplier: 0.5,
    potionHeal: 25,
    fleeBase: 0.5,
    fleePerPoint: 0.05,
    fleeMin: 0.1,
    fleeMax: 0.9,
    heroActions: ["defend"],
  });
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
  const events = fight({
    hero,
    enemy: slime,
    rng: scripted([]),
    turnBase: 100,
    spreadMin: 1,
    spreadMax: 1,
    critChance: 1,
    critMultiplier: 1.5,
    defendMultiplier: 0.5,
    potionHeal: 25,
    fleeBase: 0.5,
    fleePerPoint: 0.05,
    fleeMin: 0.1,
    fleeMax: 0.9,
    heroActions: ["defend"],
  });
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
  const events = fight({
    hero: { ...hero, hp: 5, maxHp: 30, potions: 2 },
    enemy: slime,
    rng: scripted([]),
    turnBase: 100,
    spreadMin: 1,
    spreadMax: 1,
    critChance: 0,
    critMultiplier: 1.5,
    defendMultiplier: 0.5,
    potionHeal: 25,
    fleeBase: 0.5,
    fleePerPoint: 0.05,
    fleeMin: 0.1,
    fleeMax: 0.9,
    heroActions: ["potion", "potion"],
  });
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
  const events = fight({
    hero: { ...hero, potions: 1 },
    enemy: slime,
    rng: scripted([]),
    turnBase: 100,
    spreadMin: 1,
    spreadMax: 1,
    critChance: 0,
    critMultiplier: 1.5,
    defendMultiplier: 0.5,
    potionHeal: 25,
    fleeBase: 0.5,
    fleePerPoint: 0.05,
    fleeMin: 0.1,
    fleeMax: 0.9,
    heroActions: ["potion"],
  });
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
  const events = fight({
    hero: { ...hero, hp: 5, maxHp: 30, potions: 0 },
    enemy: slime,
    rng: scripted([]),
    turnBase: 100,
    spreadMin: 1,
    spreadMax: 1,
    critChance: 0,
    critMultiplier: 1.5,
    defendMultiplier: 0.5,
    potionHeal: 25,
    fleeBase: 0.5,
    fleePerPoint: 0.05,
    fleeMin: 0.1,
    fleeMax: 0.9,
    heroActions: ["potion"],
  });
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
  potionHeal: 25,
  fleeBase: 0.5,
  fleePerPoint: 0.05,
  fleeMin: 0.1,
  fleeMax: 0.9,
};

test("a roll below the flee chance escapes and a roll of the chance does not", () => {
  const fled = fight({
    ...fleeRules,
    hero,
    enemy: slime,
    rng: scripted([0]),
    heroActions: ["flee"],
  });
  const stayed = fight({
    ...fleeRules,
    hero,
    enemy: slime,
    rng: scripted([0.65]),
    heroActions: ["flee"],
  });
  expect(fled).toEqual([{ type: "fleeAttempted", actorId: "hero", success: true, chance: 0.65 }]);
  expect(stayed.slice(0, 2)).toEqual([
    { type: "fleeAttempted", actorId: "hero", success: false, chance: 0.65 },
    { type: "attacked", actorId: "slime", targetId: "hero" },
  ]);
});

test("flee chance stays between 10% and 90%", () => {
  const capped = fight({
    ...fleeRules,
    hero: { ...hero, haste: 30 },
    enemy: slime,
    rng: scripted([0.9]),
    heroActions: ["flee"],
  });
  const floored = fight({
    ...fleeRules,
    hero: { ...hero, haste: 1 },
    enemy: { ...slime, haste: 20, str: 1 },
    rng: scripted([0, 0, 0.09]),
    heroActions: ["flee"],
  });
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
  const events = fight({
    ...fleeRules,
    hero,
    enemy: { ...slime, miniboss: true },
    rng: scripted([0, 0.5]),
    spreadMin: 0.9,
    spreadMax: 1.1,
    critChance: 0.05,
    heroActions: ["flee"],
  });
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
