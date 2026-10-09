import type { SimEvent } from "../sim/game.types";
import { nameFromId } from "./names";

/**
 * The line a played event adds to the log.
 * A turn starting is the command window, so it adds nothing.
 */
export function messageFor(event: SimEvent): string | null {
  switch (event.type) {
    case "encounterStarted":
      return event.groups.map((group) => `${nameFromId(group.id)} ×${group.count}`).join(", ");
    case "attacked":
      return `${nameFromId(event.actorId)} attacks`;
    case "damaged":
      return `${nameFromId(event.targetId)} takes ${event.amount}${event.critical ? "!" : ""}`;
    case "spellCast":
      return `${nameFromId(event.actorId)} casts ${nameFromId(event.spellId)}`;
    case "grind":
      return `${nameFromId(event.actorId)} grinds`;
    case "defended":
      return `${nameFromId(event.actorId)} defends`;
    case "itemUsed":
      return `${nameFromId(event.actorId)} drinks a potion`;
    case "fleeAttempted":
      if (event.success) return `${nameFromId(event.actorId)} escapes`;
      return event.chance === 0 ? "No escape" : `${nameFromId(event.actorId)} failed to escape`;
    case "actorDefeated":
      return `${nameFromId(event.actorId)} falls`;
    case "xpGained":
      return `Gained ${event.amount} XP`;
    case "levelUp":
      return `Level ${event.level}`;
    case "itemDropped":
      return "Found a potion";
    case "combatEnded":
      if (event.outcome === "win") return "You win";
      if (event.outcome === "flee") return "You got away";
      return "You fall";
    case "victory":
      return "Victory";
    case "gameOver":
      return `Defeated by ${nameFromId(event.killedBy)}`;
    case "turnStarted":
      return null;
  }
}
