/**
 * Holds random fights for a span of field ticks.
 *
 * The run starts with one hold, and a won pack that returns to the meadow
 * starts another. Standing still spends it. Touching the miniboss does not
 * wait on it.
 */
export class EncounterGovernorController {
  /** Ticks left before random fights can roll. */
  private ticksLeft: number;

  /**
   * @param ticks How long the first hold lasts. Zero means random fights can roll immediately.
   */
  constructor(ticks: number) {
    this.ticksLeft = ticks;
  }

  /** True while a random fight must wait. */
  active(): boolean {
    return this.ticksLeft > 0;
  }

  /** Ticks left on the hold. */
  ticksLeftNow(): number {
    return this.ticksLeft;
  }

  /** Spends one field tick. */
  tick(): void {
    if (this.ticksLeft > 0) this.ticksLeft -= 1;
  }

  /**
   * Starts a hold of this many ticks.
   *
   * @param ticks How long random fights wait. Replaces whatever was left.
   */
  hold(ticks: number): void {
    this.ticksLeft = ticks;
  }
}
