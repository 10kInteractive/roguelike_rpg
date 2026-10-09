import type { FightEvent } from "../combat/fight";

/** The numbers on the victory and game over screens. Play time is clocked by the UI. */
export type RunStats = {
  /** Seed this run was drawn from. */
  seed: number;
  /** Fights the hero won. */
  fightsWon: number;
  /** Fights the hero fled. */
  fightsFled: number;
  /** Level the hero has reached. */
  level: number;
  /** Damage the hero dealt. */
  damageDealt: number;
  /** Damage the hero took. */
  damageTaken: number;
  /** Potions the hero drank, including one that healed nothing. */
  potionsUsed: number;
  /** Tiles the hero actually walked. */
  distance: number;
  /** Mob that defeated the hero. Absent until the run is over. */
  killedBy?: string;
};

/** A scoreboard at the start of a run. */
export function createRunStats(seed: number, level: number): RunStats {
  return {
    seed,
    fightsWon: 0,
    fightsFled: 0,
    level,
    damageDealt: 0,
    damageTaken: 0,
    potionsUsed: 0,
    distance: 0,
  };
}

/** Adds the tiles of one walk. A step into a wall adds nothing. */
export function noteWalk(stats: RunStats, distance: number): RunStats {
  return { ...stats, distance: stats.distance + distance };
}

/**
 * Adds one finished fight.
 *
 * Hits the hero landed and hits the hero took both count. Each potion the hero
 * drank counts, including one that healed nothing. A win or a flee adds one to
 * that tally. A defeat records the mob and leaves the level where it was.
 */
export function noteFight(
  stats: RunStats,
  events: readonly FightEvent[],
  heroId: string,
  enemyId: string,
): RunStats {
  const next = { ...stats };
  let ended = false;

  for (const event of events) {
    if (event.type === "damaged" && event.actorId === heroId) next.damageDealt += event.amount;
    if (event.type === "damaged" && event.targetId === heroId) next.damageTaken += event.amount;
    if (event.type === "itemUsed" && event.actorId === heroId) next.potionsUsed += 1;
    if (event.type === "xpGained" || event.type === "levelUp") next.level = event.level;

    // The fight ends on a flee, the hero falling, or an enemy falling.
    if (ended) continue;
    if (event.type === "fleeAttempted" && event.success && event.actorId === heroId) {
      next.fightsFled += 1;
      ended = true;
    } else if (event.type === "actorDefeated" && event.actorId === heroId) {
      next.killedBy = enemyId;
      ended = true;
    } else if (event.type === "actorDefeated") {
      next.fightsWon += 1;
      ended = true;
    }
  }

  return next;
}
