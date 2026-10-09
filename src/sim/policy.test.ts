import { expect, test } from "vitest";
import { casterAction, fighterAction, type KnownSpell } from "./policy";

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
