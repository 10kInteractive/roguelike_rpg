import type { Action } from "../sim/game.types";

/** One row of a combat menu. Confirm opens `menu`, or sends `action`. */
export type MenuRow = {
  /** The words on the row. */
  label: string;
  /** What confirm sends. Absent when this row opens another menu, or cannot be used. */
  action?: Action;
  /** The menu confirm opens. Empty when this command cannot be used. */
  menu?: readonly MenuRow[];
};

/**
 * Fight, Magic, Item, Defend, and Run.
 *
 * Fight and a spell ask which enemy. Magic lists the spells the hero can pay
 * for. Item lists the potion, when one is carried.
 */
export function commandRows(actions: readonly Action[]): MenuRow[] {
  const fights = actions.filter((action) => action.type === "fight");
  const casts = actions.filter((action) => action.type === "cast");
  const items = actions.filter((action) => action.type === "item");
  const find = (type: "defend" | "run") => actions.find((action) => action.type === type);

  return [
    { label: "Fight", menu: fights.map((action) => ({ label: words(action.target), action })) },
    { label: "Magic", menu: spellRows(casts) },
    { label: "Item", menu: items.map((action) => ({ label: words(action.item), action })) },
    { label: "Defend", action: find("defend") },
    { label: "Run", action: find("run") },
  ];
}

/** True when confirm on this row does something. */
export function rowUsable(row: MenuRow): boolean {
  return row.action !== undefined || (row.menu?.length ?? 0) > 0;
}

/** One row per spell, and under it one row per enemy that spell can hit. */
function spellRows(casts: readonly Extract<Action, { type: "cast" }>[]): MenuRow[] {
  const spells: Extract<Action, { type: "cast" }>["spell"][] = [];
  for (const cast of casts) {
    if (!spells.includes(cast.spell)) spells.push(cast.spell);
  }
  return spells.map((spell) => ({
    label: words(spell),
    menu: casts
      .filter((cast) => cast.spell === spell)
      .map((cast) => ({ label: words(cast.target), action: cast })),
  }));
}

/** `mob.ember_imp` as `Ember Imp`, and `spell.frost` as `Frost`. */
function words(id: string): string {
  const rest = id.includes(".") ? id.slice(id.indexOf(".") + 1) : id;
  return rest
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
