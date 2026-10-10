/**
 * Which living mob is in focus before the command window opens.
 *
 * Up and down walk the line and wrap. The lead starts in focus, and a lead
 * who has already fallen hands focus to the front of the remaining line.
 */
export class MobSelectController {
  /** Encounter indices still standing, front of the line first. */
  private readonly living: readonly number[];

  /** The encounter index in focus. */
  private index: number;

  /**
   * @param living Encounter indices still standing, front of the line first.
   * @param start The mob in focus last time. A fallen one starts at the front.
   */
  constructor(living: readonly number[], start: number) {
    this.living = living;
    this.index = living.includes(start) ? start : (living[0] ?? start);
  }

  /** The encounter index in focus. */
  chosen(): number {
    return this.index;
  }

  /**
   * Moves focus along the living line.
   *
   * @param step −1 toward the front, 1 toward the back.
   */
  move(step: number): number {
    if (this.living.length === 0) return this.index;

    const at = this.living.indexOf(this.index);
    const next = (at + step + this.living.length) % this.living.length;
    this.index = this.living[next] ?? this.index;
    return this.index;
  }
}
