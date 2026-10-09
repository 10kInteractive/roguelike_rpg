import type { KnownSpell } from "../sim/combat/policy.types";

/**
 * One action as a run log stores it.
 *
 * Fight, Defend, a potion, and Run are the word. A spell keeps its id, and a
 * grind keeps its multiplier. Power and cost are filled back in on replay.
 */
export type LoggedAction =
  | "fight"
  | "defend"
  | "potion"
  | "flee"
  | {
      /** A cast. Power and cost are filled in on replay. */
      type: "spell";
      /** Which spell. */
      spellId: KnownSpell["id"];
    }
  | {
      /** A grind. The multiplier is part of the action. */
      type: "grind";
      /** Applied after the crit, before Defend. */
      multiplier: number;
    };

/** How a fight ended. A flee is neither a win nor a loss. */
export type FightOutcome = "win" | "lose" | "flee";

/** One fight's logged actions, split by side. */
export type LoggedActions = {
  /** The hero's actions, in the order the hero acted. */
  hero: LoggedAction[];
  /** The enemy's actions, in the order the enemy acted. */
  enemy: LoggedAction[];
};
