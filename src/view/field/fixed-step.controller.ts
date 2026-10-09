import { maxFrameSeconds } from "./fixed-step.constants";

/**
 * Turns uneven display frames into whole sim steps.
 *
 * Each frame adds its elapsed time. Every full step of banked time is one sim
 * step. What is left over is how far the view is between the last two steps,
 * which it uses to blend positions.
 */
export class FixedStepClock {
  /** Seconds per sim step. */
  private readonly stepSeconds: number;

  /** Time banked toward the next step, in seconds. Always under one step. */
  private banked = 0;

  /**
   * @param stepsPerSecond The sim's tick rate, such as 30.
   */
  constructor(stepsPerSecond: number) {
    if (stepsPerSecond <= 0) {
      throw new Error("Steps per second must be above zero");
    }
    this.stepSeconds = 1 / stepsPerSecond;
  }

  /**
   * Banks one frame and says how many sim steps are due.
   *
   * @param elapsedSeconds Time since the last frame. Capped at `maxFrameSeconds`.
   */
  advance(elapsedSeconds: number): number {
    this.banked += Math.min(Math.max(elapsedSeconds, 0), maxFrameSeconds);
    const steps = Math.floor(this.banked / this.stepSeconds);
    this.banked -= steps * this.stepSeconds;
    return steps;
  }

  /** How far the view is from the last step toward the next, from 0 up to 1. */
  get blend(): number {
    return Math.min(this.banked / this.stepSeconds, 1);
  }
}
