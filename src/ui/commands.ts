import type { Action } from "../sim/game.types";

/** One row of the command window. */
export type CommandRow = {
  /** The label on the row. */
  label: "Fight" | "Magic" | "Item" | "Defend" | "Run";
  /** What confirm sends. Null when the command cannot be used. */
  action: Action | null;
};

/**
 * The five commands, in window order.
 *
 * Magic has no action yet: its spell list is the next menu. Item is the
 * potion when the hero has one.
 */
export function commandRows(actions: readonly Action[]): CommandRow[] {
  const find = (type: Action["type"]) => actions.find((action) => action.type === type) ?? null;
  return [
    { label: "Fight", action: find("fight") },
    { label: "Magic", action: null },
    { label: "Item", action: find("item") },
    { label: "Defend", action: find("defend") },
    { label: "Run", action: find("run") },
  ];
}
