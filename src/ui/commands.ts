import type { Action } from "../sim/game.types";
import { nameFromId } from "./names";

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
 * One enemy locks Fight and each spell onto that enemy. Several enemies ask
 * which one. Magic lists the spells the hero can pay for. Item lists the
 * potion, when one is carried.
 */
export function commandRows(actions: readonly Action[]): MenuRow[] {
  const fights = actions.filter((action) => action.type === "fight");
  const casts = actions.filter((action) => action.type === "cast");
  const items = actions.filter((action) => action.type === "item");
  const find = (type: "defend" | "run") => actions.find((action) => action.type === type);
  const targets = fights.map((action) => ({ label: nameFromId(action.target), action }));
  const only = targets.length === 1 ? targets[0] : undefined;

  return [
    only ? { label: "Fight", action: only.action } : { label: "Fight", menu: targets },
    { label: "Magic", menu: spellRows(casts) },
    { label: "Item", menu: items.map((action) => ({ label: nameFromId(action.item), action })) },
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
  return spells.map((spell) => {
    const targets = casts
      .filter((cast) => cast.spell === spell)
      .map((cast) => ({ label: nameFromId(cast.target), action: cast }));
    const only = targets.length === 1 ? targets[0] : undefined;
    if (only) return { label: nameFromId(spell), action: only.action };
    return { label: nameFromId(spell), menu: targets };
  });
}
