import { expect, test } from "vitest";
import type { Rng } from "../utils/rng.types";
import { CombatActionPolicy } from "./policy.controller";
import type { KnownSpell } from "./policy.types";

const spells: KnownSpell[] = [
  { id: "spell.ember", element: "fire", power: 8, cost: 3 },
  { id: "spell.frost", element: "ice", power: 8, cost: 3 },
];

test("the fighter drinks below 30% HP and otherwise fights", () => {
  const policy = new CombatActionPolicy(spells, rolls([]));
  expect(policy.chooseFighter({ hp: 8, maxHp: 30, potions: 1 })).toBe("potion");
  expect(policy.chooseFighter({ hp: 9, maxHp: 30, potions: 1 })).toBe("fight");
  expect(policy.chooseFighter({ hp: 8, maxHp: 30, potions: 0 })).toBe("fight");
});

test("the caster matches the target's weakness, then fights when MP runs out", () => {
  const policy = new CombatActionPolicy(spells, rolls([]));
  expect(policy.chooseCaster({ mp: 10 }, { weak: "ice" })).toMatchObject({
    type: "spell",
    spellId: "spell.frost",
  });
  expect(policy.chooseCaster({ mp: 10 }, { weak: "fire" })).toMatchObject({
    type: "spell",
    spellId: "spell.ember",
  });
  expect(policy.chooseCaster({ mp: 10 }, {})).toBe("fight");
  expect(policy.chooseCaster({ mp: 2 }, { weak: "ice" })).toBe("fight");
});

test("the random policy picks a legal action and skips what the hero cannot pay", () => {
  const ready = { mp: 10, potions: 1 };
  const random = (roll: number) => new CombatActionPolicy(spells, rolls([roll]));
  expect(random(0).chooseRandom(ready)).toBe("fight");
  expect(random(0.2).chooseRandom(ready)).toBe("defend");
  expect(random(0.4).chooseRandom(ready)).toBe("potion");
  expect(random(0.5).chooseRandom(ready)).toBe("flee");
  expect(random(0.7).chooseRandom(ready)).toMatchObject({ spellId: "spell.ember" });
  expect(random(0.9).chooseRandom(ready)).toMatchObject({ spellId: "spell.frost" });

  const broke = { mp: 0, potions: 0 };
  expect(random(0).chooseRandom(broke)).toBe("fight");
  expect(random(0.5).chooseRandom(broke)).toBe("defend");
  expect(random(0.9).chooseRandom(broke)).toBe("flee");
});

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
