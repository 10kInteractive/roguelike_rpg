import type { FightEvent } from "../combat/fight.types";
import type { RunStats } from "./stats.types";

/** The scoreboard for one run. Walks and finished fights add to it. */
export class RunStatistics {
  /** The tallies so far. */
  private readonly stats: RunStats;

  /** Id the hero's fight events carry. */
  private readonly heroId: string;

  /**
   * @param seed Seed this run was drawn from.
   * @param level Hero level at the start of the run.
   * @param heroId Id the hero's fight events carry.
   */
  constructor(seed: number, level: number, heroId: string) {
    this.heroId = heroId;
    this.stats = {
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

  /** A copy of the tallies, for the victory or game over screen. */
  snapshot(): RunStats {
    return { ...this.stats };
  }

  /** Adds the tiles of one walk. A step into a wall adds nothing. */
  addWalk(distance: number): void {
    this.stats.distance += distance;
  }

  /**
   * Adds one finished fight.
   *
   * Hits the hero landed and hits the hero took both count. Each potion the
   * hero drank counts, including one that healed nothing. A win or a flee adds
   * one to that tally. A defeat records the mob and leaves the level where it was.
   *
   * @param events Everything that happened in the fight, in order.
   * @param enemyId Mob the hero fought, named if it defeats the hero.
   */
  addFight(events: readonly FightEvent[], enemyId: string): void {
    const stats = this.stats;
    const heroId = this.heroId;
    let ended = false;

    for (const event of events) {
      if (event.type === "damaged" && event.actorId === heroId) stats.damageDealt += event.amount;
      if (event.type === "damaged" && event.targetId === heroId) stats.damageTaken += event.amount;
      if (event.type === "itemUsed" && event.actorId === heroId) stats.potionsUsed += 1;
      if (event.type === "xpGained" || event.type === "levelUp") stats.level = event.level;

      // The fight ends on a flee, the hero falling, or an enemy falling.
      if (ended) continue;
      if (event.type === "fleeAttempted" && event.success && event.actorId === heroId) {
        stats.fightsFled += 1;
        ended = true;
      } else if (event.type === "actorDefeated" && event.actorId === heroId) {
        stats.killedBy = enemyId;
        ended = true;
      } else if (event.type === "actorDefeated") {
        stats.fightsWon += 1;
        ended = true;
      }
    }
  }
}
