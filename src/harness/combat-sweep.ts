import type { SweepFight } from "./combat-sweep.types";

/**
 * One line each for the fight count, the win rate, and deaths by mob.
 *
 * A flee is neither a win nor a death. Win rate is wins divided by fights.
 */
export function formatCombatSeedSweepSummary(fights: readonly SweepFight[]): string {
  const wins = fights.filter((fight) => fight.outcome === "win").length;
  const rate = fights.length === 0 ? 0 : wins / fights.length;
  const deaths = new Map<string, number>();
  for (const fight of fights) {
    if (fight.outcome !== "lose") continue;
    deaths.set(fight.enemyId, (deaths.get(fight.enemyId) ?? 0) + 1);
  }

  const lines = [`fights ${fights.length}`, `win rate ${rate.toFixed(3)}`];
  const killers = [...deaths.keys()].sort();
  if (killers.length === 0) lines.push("deaths none");
  for (const id of killers) lines.push(`deaths ${id} ${deaths.get(id)}`);
  return lines.join("\n");
}
