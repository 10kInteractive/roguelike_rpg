import { expect, test } from "vitest";
import type { Action } from "../sim/game.types";
import { commandRows, rowUsable } from "./commands";

const slime: Action = { type: "fight", target: "mob.slime" };
const imp: Action = { type: "fight", target: "mob.ember_imp" };
const ember: Action = { type: "cast", spell: "spell.ember", target: "mob.slime" };
const emberImp: Action = { type: "cast", spell: "spell.ember", target: "mob.ember_imp" };
const frost: Action = { type: "cast", spell: "spell.frost", target: "mob.ember_imp" };
const potion: Action = { type: "item", item: "item.potion" };

test("fight and magic ask which enemy, and item asks which potion", () => {
  const rows = commandRows([
    slime,
    imp,
    ember,
    emberImp,
    frost,
    potion,
    { type: "defend" },
    { type: "run" },
  ]);

  expect(rows.map((row) => row.label)).toEqual(["Fight", "Magic", "Item", "Defend", "Run"]);
  expect(rows[0]?.menu).toEqual([
    { label: "Slime", action: slime },
    { label: "Ember Imp", action: imp },
  ]);
  expect(rows[1]?.menu).toEqual([
    {
      label: "Ember",
      menu: [
        { label: "Slime", action: ember },
        { label: "Ember Imp", action: emberImp },
      ],
    },
    { label: "Frost", action: frost },
  ]);
  expect(rows[2]?.menu).toEqual([{ label: "Potion", action: potion }]);
  expect(rows[3]?.action).toEqual({ type: "defend" });
  expect(rows[4]?.action).toEqual({ type: "run" });
});

test("one enemy locks fight and a spell onto that enemy", () => {
  const rows = commandRows([slime, ember, { type: "defend" }, { type: "run" }]);
  const fight = rows.find((row) => row.label === "Fight");
  const magic = rows.find((row) => row.label === "Magic");

  expect(fight?.action).toEqual(slime);
  expect(fight?.menu).toBeUndefined();
  expect(magic?.menu).toEqual([{ label: "Ember", action: ember }]);
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
