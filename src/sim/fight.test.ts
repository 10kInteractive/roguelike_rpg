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
