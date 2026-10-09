/**
 * Physical damage for one hit.
 *
 * Attack minus half the target's defense, multiplied by `spread`, then rounded
 * down. The result is at least 1, so a weak hit still lands.
 *
 * @param attack The attacker's STR.
 * @param defense The target's DEF.
 * @param spread Roll in the bundle's damage range, such as 0.9 to 1.1.
 */
export function physicalDamage(attack: number, defense: number, spread: number): number {
  const raw = (attack - defense / 2) * spread;
  return Math.max(1, Math.floor(raw));
}

/**
 * Extra damage for a critical hit.
 *
 * Multiplies an already rounded hit, then rounds down again.
 */
export function applyCritical(damage: number, multiplier: number): number {
  return Math.max(1, Math.floor(damage * multiplier));
}

export type Element = "fire" | "ice";

/**
 * The multiplier for one elemental hit.
 *
 * A matching weakness wins over a matching resistance. Anything else is ×1.
 */
export function elementMultiplier(
  element: Element,
  weak: Element | undefined,
  resists: Element | undefined,
  weaknessMultiplier: number,
  resistanceMultiplier: number,
): number {
  if (weak === element) return weaknessMultiplier;
  if (resists === element) return resistanceMultiplier;
  return 1;
}

/**
 * Magic damage for one spell.
 *
 * Spell power plus MAG, times the element multiplier and the spread, then
 * rounded down. The result is at least 1. Defense is ignored, and spells do
 * not crit.
 */
export function magicDamage(
  power: number,
  mag: number,
  multiplier: number,
  spread: number,
): number {
  const raw = (power + mag) * multiplier * spread;
  return Math.max(1, Math.floor(raw));
}
