import { expect, test } from "vitest";
import { fighterAction } from "./policy";

test("the fighter drinks below 30% HP and otherwise fights", () => {
  expect(fighterAction({ hp: 8, maxHp: 30, potions: 1 })).toBe("potion");
  expect(fighterAction({ hp: 9, maxHp: 30, potions: 1 })).toBe("fight");
  expect(fighterAction({ hp: 8, maxHp: 30, potions: 0 })).toBe("fight");
});
