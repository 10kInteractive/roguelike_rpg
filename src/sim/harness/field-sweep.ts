import type { FieldRunResult } from "../run/run.types";

/**
 * One line each for the grinder sweep.
 *
 * Win rate is miniboss kills divided by runs. Boss level averages only the
 * runs that started that fight. A flee is a fight, and it is not a death.
 */
export function fieldSweepSummary(runs: readonly FieldRunResult[]): string {
  const count = runs.length;
  const wins = runs.filter((run) => run.outcome === "win").length;
  const arrived = runs.filter((run) => run.bossLevel !== undefined);
  const boss =
    arrived.length === 0
      ? undefined
      : arrived.reduce((sum, run) => sum + (run.bossLevel ?? 0), 0) / arrived.length;
  const deaths = new Map<string, number>();
  for (const run of runs) {
    if (!run.killedBy) continue;
    deaths.set(run.killedBy, (deaths.get(run.killedBy) ?? 0) + 1);
  }

  const lines = [
    `runs ${count}`,
    `win rate ${(count === 0 ? 0 : wins / count).toFixed(3)}`,
    boss === undefined ? "boss level none" : `boss level ${boss.toFixed(3)}`,
    `fights ${formatAverage(runs.map((run) => run.fights))}`,
    `distance ${formatAverage(runs.map((run) => run.distance))}`,
    `play time ${formatAverage(runs.map((run) => run.playSeconds / 60))} min`,
    `potions ${formatAverage(runs.map((run) => run.potionsUsed))}`,
  ];
  const killers = [...deaths.keys()].sort();
  if (killers.length === 0) lines.push("deaths none");
  for (const id of killers) lines.push(`deaths ${id} ${deaths.get(id)}`);
  return lines.join("\n");
}

/** The average of the runs, printed to three decimal places. An empty sweep is 0. */
function formatAverage(values: readonly number[]): string {
  const total = values.reduce((sum, value) => sum + value, 0);
  return (values.length === 0 ? 0 : total / values.length).toFixed(3);
}
