import { expect, test } from "vitest";
import { type FightEvent, fight } from "./fight";
import { createRng } from "./rng";

const hero = { id: "hero", hp: 30, str: 8, def: 4, haste: 8, hero: true };
const slime = { id: "slime", hp: 12, str: 6, def: 2, haste: 5 };

function heroVersusSlime(seed: number): FightEvent[] {
  return fight({
    hero,
    enemy: slime,
    rng: createRng(seed),
    turnBase: 100,
    spreadMin: 0.9,
    spreadMax: 1.1,
  });
}

test("a hero and a slime trade hits until the slime reaches zero", () => {
  expect(heroVersusSlime(1)).toEqual([
    { type: "attacked", actorId: "hero", targetId: "slime" },
    { type: "damaged", actorId: "hero", targetId: "slime", amount: 7, targetHp: 5 },
    { type: "attacked", actorId: "slime", targetId: "hero" },
    { type: "damaged", actorId: "slime", targetId: "hero", amount: 3, targetHp: 27 },
    { type: "attacked", actorId: "hero", targetId: "slime" },
    { type: "damaged", actorId: "hero", targetId: "slime", amount: 7, targetHp: 0 },
  ]);
});

test("the same seed plays the same fight", () => {
  expect(heroVersusSlime(1)).toEqual(heroVersusSlime(1));
});
