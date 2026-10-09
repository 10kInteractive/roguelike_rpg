import type { Rng } from "./rng.types";

/**
 * Mulberry32 generator for one run.
 *
 * Combat rolls, loot, encounters, and map noise all draw from this generator.
 * Replaying a run means constructing it again with the same seed and taking
 * the same number of values, in the browser or in Node.
 *
 * The constructor reads the seed as an unsigned 32-bit integer, so a value
 * outside that range wraps to one generator rather than a different algorithm.
 * Each step mixes that state with 32-bit multiply and xor. `next()` divides
 * the resulting integer by 2^32. Every integer involved fits exactly in a
 * float, and so does that division, so two engines that follow IEEE-754
 * produce the same sequence.
 */
export class SeededRandomGenerator implements Rng {
  /** Mulberry32 state, kept in the unsigned 32-bit range. */
  private state: number;

  /**
   * @param seed Run seed, read as an unsigned 32-bit integer.
   */
  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** The next value in [0, 1). Each call advances the generator. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
