import { expect, test } from "vitest";
import type { Rng } from "../rng";
import type { MeadowMap } from "./map";
import { tilesPerSecond } from "./movement";
import { enemyActionSeconds, fightTransitionSeconds, heroDecisionSeconds, runField } from "./run";

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

function zeros(): Rng {
  return { next: () => 0 };
}

function meadow(width: number, minibossX: number): MeadowMap {
  return {
    width,
    height: 1,
    tiles: Array.from({ length: width }, () => "grass"),
    spawn: { x: 0, y: 0 },
    miniboss: { x: minibossX, y: 0 },
  };
}

const hero = { id: "hero", hp: 30, str: 8, def: 4, haste: 8, level: 1, xp: 0 };

test("a slime's XP carries, and the run ends when the miniboss falls", () => {
  const map = meadow(12, 10);
  const mobs = new Map([
    [
      "mob.slime",
      {
        fighter: {
          id: "mob.slime",
          hp: 1,
          str: 1,
          def: 0,
          haste: 5,
          xpReward: 6,
          actions: [{ type: "fight" as const, weight: 1 }],
        },
      },
    ],
    [
      "mob.rust_sentinel",
      {
        fighter: {
          id: "mob.rust_sentinel",
          hp: 1,
          str: 1,
          def: 0,
          haste: 1,
          miniboss: true,
          actions: [{ type: "fight" as const, weight: 1 }],
        },
      },
    ],
  ]);
  const played = runField({
    seed: 1,
    map,
    miniboss: { tile: map.miniboss, radius: 0.8, id: "mob.rust_sentinel" },
    tables: {
      grass: { rate: 1, packs: [{ weight: 1, groups: [{ id: "mob.slime", min: 1, max: 1 }] }] },
    },
    minDistance: 100,
    hero,
    mobs,
    combat,
    leveling,
    rngs: { field: zeros(), choice: zeros(), combat: zeros() },
  });

  expect(played.outcome).toBe("win");
  expect(played.bossLevel).toBe(2);
  expect(played.fights).toBe(2);
  expect(played.potionsUsed).toBe(0);
  expect(played.killedBy).toBeUndefined();
  expect(played.playSeconds).toBeCloseTo(
    2 * heroDecisionSeconds + 2 * fightTransitionSeconds + played.distance / tilesPerSecond,
  );
});

test("dying to the miniboss records that mob and the level the hero arrived at", () => {
  const map = meadow(8, 5);
  const mobs = new Map([
    [
      "mob.rust_sentinel",
      {
        fighter: {
          id: "mob.rust_sentinel",
          hp: 90,
          str: 20,
          def: 8,
          haste: 30,
          miniboss: true,
          actions: [{ type: "fight" as const, weight: 1 }],
        },
      },
    ],
  ]);
  const played = runField({
    seed: 4,
    map,
    miniboss: { tile: map.miniboss, radius: 0.8, id: "mob.rust_sentinel" },
    tables: { grass: { rate: 0, packs: [] } },
    minDistance: 4,
    hero: { ...hero, hp: 1, level: 5 },
    mobs,
    combat,
    leveling,
    rngs: { field: zeros(), choice: zeros(), combat: zeros() },
  });

  expect(played.outcome).toBe("lose");
  expect(played.killedBy).toBe("mob.rust_sentinel");
  expect(played.bossLevel).toBe(5);
  expect(played.fights).toBe(1);
  expect(played.playSeconds).toBeCloseTo(
    enemyActionSeconds + fightTransitionSeconds + played.distance / tilesPerSecond,
  );
  const again = runField({
    seed: 4,
    map,
    miniboss: { tile: map.miniboss, radius: 0.8, id: "mob.rust_sentinel" },
    tables: { grass: { rate: 0, packs: [] } },
    minDistance: 4,
    hero: { ...hero, hp: 1, level: 5 },
    mobs,
    combat,
    leveling,
  });
  const repeated = runField({
    seed: 4,
    map,
    miniboss: { tile: map.miniboss, radius: 0.8, id: "mob.rust_sentinel" },
    tables: { grass: { rate: 0, packs: [] } },
    minDistance: 4,
    hero: { ...hero, hp: 1, level: 5 },
    mobs,
    combat,
    leveling,
  });
  expect(again).toEqual(repeated);
});
