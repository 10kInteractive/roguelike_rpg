import type { FightOutcome } from "./replay.types";

/** One fight in a combat sweep. */
export type SweepFight = {
  /** Mob that was fought, such as `mob.slime`. */
  enemyId: string;
  /** Win, lose, or flee. A flee is neither a win nor a death. */
  outcome: FightOutcome;
};
