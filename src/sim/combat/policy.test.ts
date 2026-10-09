import { expect, test } from "vitest";
import type { Rng } from "../rng";
import { casterAction, fighterAction, type KnownSpell, randomAction } from "./policy";

const spells: KnownSpell[] = [
  { id: "spell.ember", element: "fire", power: 8, cost: 3 },
  { id: "spell.frost", element: "ice", power: 8, cost: 3 },
];

test("the fighter drinks below 30% HP and otherwise fights", () => {
  expect(fighterAction({ hp: 8, maxHp: 30, potions: 1 })).toBe("potion");
  expect(fighterAction({ hp: 9, maxHp: 30, potions: 1 })).toBe("fight");
  expect(fighterAction({ hp: 8, maxHp: 30, potions: 0 })).toBe("fight");
});

test("the caster matches the target's weakness, then fights when MP runs out", () => {
  expect(casterAction({ mp: 10 }, { weak: "ice" }, spells)).toMatchObject({
    type: "spell",
    spellId: "spell.frost",
  });
  expect(casterAction({ mp: 10 }, { weak: "fire" }, spells)).toMatchObject({
    type: "spell",
    spellId: "spell.ember",
  });
  expect(casterAction({ mp: 10 }, {}, spells)).toBe("fight");
  expect(casterAction({ mp: 2 }, { weak: "ice" }, spells)).toBe("fight");
});

test("the random policy picks a legal action and skips what the hero cannot pay", () => {
  const ready = { mp: 10, potions: 1 };
  expect(randomAction(ready, spells, rolls([0]))).toBe("fight");
  expect(randomAction(ready, spells, rolls([0.2]))).toBe("defend");
  expect(randomAction(ready, spells, rolls([0.4]))).toBe("potion");
  expect(randomAction(ready, spells, rolls([0.5]))).toBe("flee");
  expect(randomAction(ready, spells, rolls([0.7]))).toMatchObject({ spellId: "spell.ember" });
  expect(randomAction(ready, spells, rolls([0.9]))).toMatchObject({ spellId: "spell.frost" });

  const broke = { mp: 0, potions: 0 };
  expect(randomAction(broke, spells, rolls([0]))).toBe("fight");
  expect(randomAction(broke, spells, rolls([0.5]))).toBe("defend");
  expect(randomAction(broke, spells, rolls([0.9]))).toBe("flee");
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
