/**
 * Chance to flee one attempt.
 *
 * Base chance plus a bonus per point of hero haste over the enemies' average
 * haste. The result is clamped to the bundle's minimum and maximum. A later
 * roll succeeds when it is below this chance.
 */
export function calculateFleeChance(
  heroHaste: number,
  enemyHaste: number,
  base: number,
  perPoint: number,
  min: number,
  max: number,
): number {
  const raw = base + perPoint * (heroHaste - enemyHaste);
  return Math.min(max, Math.max(min, raw));
}
