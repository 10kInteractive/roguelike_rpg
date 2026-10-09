import { mulberry32Step } from "./rng.constants";

/**
 * One value in [0, 1) from a 32-bit seed. The same seed always gives the same value.
 *
 * This is the first value `new SeededRandomGenerator(seed)` would produce, without
 * building a generator. Use it when one number per input is all that is needed,
 * such as map noise at a lattice point.
 */
export function hashToUnit(seed: number): number {
  const state = (seed + mulberry32Step) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
