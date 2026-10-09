import { expect, test } from "vitest";
import type { Action } from "../sim/game.types";
import { commandRows } from "./commands";

const fight: Action = { type: "fight", target: "mob.slime" };
const ember: Action = { type: "cast", spell: "spell.ember", target: "mob.slime" };
const potion: Action = { type: "item", item: "item.potion" };

test("the window lists the five commands, and magic waits for its menu", () => {
  const rows = commandRows([fight, ember, potion, { type: "defend" }, { type: "run" }]);
  expect(rows.map((row) => row.label)).toEqual(["Fight", "Magic", "Item", "Defend", "Run"]);
  expect(rows.map((row) => row.action)).toEqual([
    fight,
    null,
    potion,
    { type: "defend" },
    { type: "run" },
  ]);
});

test("a command the hero cannot use has no action", () => {
  const rows = commandRows([fight, { type: "defend" }, { type: "run" }]);
  expect(rows.find((row) => row.label === "Item")?.action).toBeNull();
});
