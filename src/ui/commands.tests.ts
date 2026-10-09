import { expect, test } from "vitest";
import type { Action } from "../sim/game.types";
import { commandRows, rowUsable } from "./commands";

const slime: Action = { type: "fight", target: "mob.slime" };
const imp: Action = { type: "fight", target: "mob.ember_imp" };
const ember: Action = { type: "cast", spell: "spell.ember", target: "mob.slime" };
const frost: Action = { type: "cast", spell: "spell.frost", target: "mob.ember_imp" };
const potion: Action = { type: "item", item: "item.potion" };

test("fight and magic ask which enemy, and item asks which potion", () => {
  const rows = commandRows([slime, imp, ember, frost, potion, { type: "defend" }, { type: "run" }]);

  expect(rows.map((row) => row.label)).toEqual(["Fight", "Magic", "Item", "Defend", "Run"]);
  expect(rows[0]?.menu).toEqual([
    { label: "Slime", action: slime },
    { label: "Ember Imp", action: imp },
  ]);
  expect(rows[1]?.menu).toEqual([
    { label: "Ember", menu: [{ label: "Slime", action: ember }] },
    { label: "Frost", menu: [{ label: "Ember Imp", action: frost }] },
  ]);
  expect(rows[2]?.menu).toEqual([{ label: "Potion", action: potion }]);
  expect(rows[3]?.action).toEqual({ type: "defend" });
  expect(rows[4]?.action).toEqual({ type: "run" });
});

test("magic and item are closed when the hero cannot use them", () => {
  const rows = commandRows([slime, { type: "defend" }, { type: "run" }]);
  const magic = rows.find((row) => row.label === "Magic");
  const item = rows.find((row) => row.label === "Item");
  if (!magic || !item) throw new Error("the window is missing a command");

  expect(rowUsable(magic)).toBe(false);
  expect(rowUsable(item)).toBe(false);
  expect(rowUsable(rows[0] ?? magic)).toBe(true);
});
