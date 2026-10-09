export type Rng = {
  /** The next value in [0, 1). Each call advances the generator. */
  next(): number;
};

/**
 * Creates the mulberry32 generator for one run.
 *
 * Combat rolls, loot, encounters, and map noise all draw from the generator
 * this returns. Replaying a run means constructing it again with the same seed
 * and taking the same number of values, in the browser or in Node.
 *
 * `seed >>> 0` keeps the seed in the unsigned 32-bit range, so a value outside
 * that range wraps to one generator rather than a different algorithm. Each
 * step mixes that state with 32-bit multiply and xor. `next()` divides the
 * resulting integer by 2^32. Every integer involved fits exactly in a float,
 * and so does that division, so two engines that follow IEEE-754 produce the
 * same sequence.
 *
 * @param seed Run seed, read as an unsigned 32-bit integer.
 * @returns A generator of values in [0, 1).
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  return {
    next() {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}
