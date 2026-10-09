import type { FightEvent, ScriptedAction } from "../combat/fight";
import type { KnownSpell } from "../combat/policy";

export type LoggedAction =
  | "fight"
  | "defend"
  | "potion"
  | "flee"
  | { type: "spell"; spellId: KnownSpell["id"] }
  | { type: "grind"; multiplier: number };

export type FightOutcome = "win" | "lose" | "flee";

/**
 * A stable hash of one event list.
 *
 * The same events always hash the same, in Node and in the browser.
 */
export function eventHash(events: readonly FightEvent[]): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const text = JSON.stringify(events);
  for (let i = 0; i < text.length; i++) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}

/** The hero's actions and the enemy's, in the order each of them acted. */
export function actionsFrom(
  events: readonly FightEvent[],
  heroId: string,
): { hero: LoggedAction[]; enemy: LoggedAction[] } {
  const hero: LoggedAction[] = [];
  const enemy: LoggedAction[] = [];
  for (const event of events) {
    const action = loggedAction(event);
    if (!action || !("actorId" in event)) continue;
    (event.actorId === heroId ? hero : enemy).push(action);
  }
  return { hero, enemy };
}

/** Win when the enemy falls, flee when the hero escapes, lose when the hero falls. */
export function outcomeFrom(events: readonly FightEvent[], heroId: string): FightOutcome {
  for (const event of events) {
    if (event.type === "fleeAttempted" && event.success) return "flee";
    if (event.type === "actorDefeated") return event.actorId === heroId ? "lose" : "win";
  }
  return "lose";
}

/** Fills in spell power and cost so a logged action can be played again. */
export function toScript(
  actions: readonly LoggedAction[],
  spells: readonly KnownSpell[],
): ScriptedAction[] {
  return actions.map((action) => {
    if (typeof action === "string" || action.type === "grind") return action;
    const spell = spells.find((entry) => entry.id === action.spellId);
    if (!spell) throw new Error(`Unknown spell "${action.spellId}"`);
    return {
      type: "spell",
      spellId: spell.id,
      element: spell.element,
      power: spell.power,
      cost: spell.cost,
    };
  });
}

function loggedAction(event: FightEvent): LoggedAction | undefined {
  switch (event.type) {
    case "attacked":
      return "fight";
    case "defended":
      return "defend";
    case "itemUsed":
      return "potion";
    case "fleeAttempted":
      return "flee";
    case "spellCast":
      return { type: "spell", spellId: event.spellId };
    case "grind":
      return { type: "grind", multiplier: event.multiplier };
    default:
      return undefined;
  }
}
