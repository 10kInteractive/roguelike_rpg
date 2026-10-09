import { expect, test } from "vitest";
import type { MenuRow } from "../../commands";
import { CommandWindowController } from "./controller";

const fight: MenuRow = {
  label: "Fight",
  menu: [{ label: "Slime", action: { type: "fight", target: "mob.slime" } }],
};
const defend: MenuRow = { label: "Defend", action: { type: "defend" } };
const magic: MenuRow = { label: "Magic", menu: [] };

test("the cursor starts on Fight, wraps, and a submenu opens and closes", () => {
  const menu = new CommandWindowController(() => {});
  menu.open([fight, magic, defend]);
  expect(menu.view()?.rows.map((row) => row.cursor)).toEqual(["▸", " ", " "]);

  menu.apply("up");
  expect(menu.view()?.rows[2]?.cursor).toBe("▸");
  menu.apply("down");
  expect(menu.view()?.rows[0]?.cursor).toBe("▸");

  expect(menu.apply("confirm")).toBeNull();
  expect(menu.view()?.rows.map((row) => row.label)).toEqual(["Slime"]);

  menu.apply("cancel");
  expect(menu.view()?.rows.map((row) => row.label)).toEqual(["Fight", "Magic", "Defend"]);
  expect(menu.view()?.rows[0]?.cursor).toBe("▸");
});

test("confirm sends the row's action, and an empty menu does not", () => {
  const menu = new CommandWindowController(() => {});
  menu.open([fight, magic, defend]);

  menu.apply("down");
  expect(menu.apply("confirm")).toBeNull();
  expect(menu.view()?.rows[1]?.className).toContain("unavailable");

  menu.apply("down");
  expect(menu.apply("confirm")).toEqual({ type: "defend" });
});

test("two rows with the same name keep different keys", () => {
  const menu = new CommandWindowController(() => {});
  const slime: MenuRow = { label: "Slime", action: { type: "fight", target: "mob.slime" } };
  menu.open([slime, slime]);
  const keys = menu.view()?.rows.map((row) => row.key);
  expect(keys).toEqual(["0:fight:mob.slime", "1:fight:mob.slime"]);
});
