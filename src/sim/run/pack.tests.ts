import { expect, test } from "vitest";
import type { Fighter } from "../combat/fight.types";
import type { Rng } from "../utils/rng.types";
import { PackFightController } from "./pack.controller";
import type { PackFightInput } from "./pack.types";
import type { RunMob } from "./run.types";

const combat = {
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
  weaknessMultiplier: 1.5,
  resistanceMultiplier: 0.5,
};

const leveling = {
  xpPerLevel: 6,
  levelCap: 10,
  growth: { hp: 6, mp: 2, str: 2, def: 1, mag: 1, haste: 1 },
};

const hero: Fighter = { id: "hero", hp: 30, str: 8, def: 4, haste: 8, potions: 1 };

/** A mob the hero kills in one swing. */
const weakling: RunMob = {
  fighter: {
    id: "mob.slime",
    hp: 1,
    str: 1,
    def: 0,
    haste: 5,
    xpReward: 2,
    actions: [{ type: "fight", weight: 1 }],
  },
  potionDrop: 0.5,
};

/** A mob that acts first and kills a 1 HP hero. */
const brute: RunMob = {
  fighter: {
    id: "mob.brute",
    hp: 90,
    str: 50,
    def: 8,
    haste: 30,
    actions: [{ type: "fight", weight: 1 }],
  },
};

function zeros(): Rng {
  return { next: () => 0 };
}

function packs(overrides: Partial<PackFightInput> = {}): PackFightController {
  return new PackFightController({
    hero,
    mobs: new Map([
      ["mob.slime", weakling],
      ["mob.brute", brute],
    ]),
    combat,
    leveling,
    heroPolicy: () => "fight",
    rngs: { drops: zeros(), choice: zeros(), combat: zeros() },
    ...overrides,
  });
}

test("XP and drops carry from one mob to the next, and into the next pack", () => {
  const pack = packs();
  const first = pack.fight([{ id: "mob.slime", count: 2 }]);
  expect(first.outcome).toBe("win");
  expect(first.fights.map((fight) => fight.mobId)).toEqual(["mob.slime", "mob.slime"]);
  expect(first.fights.every((fight) => fight.potionDropped)).toBe(true);
  expect(pack.hero()).toMatchObject({ xp: 4, potions: 3 });

  pack.fight([{ id: "mob.slime", count: 1 }]);
  expect(pack.hero()).toMatchObject({ level: 2, potions: 4 });
});

test("a flee ends the pack and drops nothing", () => {
  const result = packs({ heroPolicy: () => "flee" }).fight([{ id: "mob.slime", count: 3 }]);
  expect(result.outcome).toBe("flee");
  expect(result.fights).toHaveLength(1);
  expect(result.fights[0]?.potionDropped).toBe(false);
});

test("a defeat ends the pack before the next mob", () => {
  const pack = packs({ hero: { ...hero, hp: 1 } });
  const result = pack.fight([
    { id: "mob.brute", count: 1 },
    { id: "mob.slime", count: 1 },
  ]);
  expect(result.outcome).toBe("lose");
  expect(result.fights.map((fight) => fight.mobId)).toEqual(["mob.brute"]);
  expect(pack.hero().hp).toBe(0);
});

test("a miniboss win ends the pack", () => {
  const result = packs().fight([{ id: "mob.slime", count: 2 }], true);
  expect(result.outcome).toBe("win");
  expect(result.fights).toHaveLength(1);
});

test("hero() is a copy the caller cannot change", () => {
  const pack = packs();
  pack.hero().hp = 999;
  expect(pack.hero().hp).toBe(30);
});
