import { hashToUnit } from "./rng";
import { mulberry32Step } from "./rng.constants";
import type { Rng } from "./rng.types";

/**
 * Mulberry32 generator for one run.
 *
 * Combat rolls, loot, encounters, and spawn picks draw from this generator.
 * Replaying a run means constructing it again with the same seed and taking
 * the same number of values, in the browser or in Node.
 *
 * Mulberry32 is a hash of a counter. The counter starts at the seed, read as
 * an unsigned 32-bit integer, and moves by a fixed step per value. Every
 * integer involved fits exactly in a float, and so does the final division,
 * so two engines that follow IEEE-754 produce the same sequence.
 */
export class SeededRandomGenerator implements Rng {
  /** The mulberry32 counter. */
  private state: number;

  /**
   * @param seed Run seed, read as an unsigned 32-bit integer.
   */
  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** The next value in [0, 1). Each call advances the generator. */
  next(): number {
    const value = hashToUnit(this.state);
    this.state = (this.state + mulberry32Step) | 0;
    return value;
  }
}
