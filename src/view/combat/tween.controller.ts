import type { Tween } from "./tween.types";

/**
 * Timed animations a sequence can `await`, advanced by display frames.
 *
 * The render loop calls `advance` once per frame. A tween never skips its
 * end: the frame that passes its duration steps it at exactly 1, then
 * settles its promise.
 */
export class TweenController {
  /** Animations still running. */
  private readonly running: Tween[] = [];

  /**
   * Starts an animation.
   *
   * @param duration Length in seconds. Zero or less steps at 1 on the next frame.
   * @param step Called each frame with progress from 0 to 1.
   */
  run(duration: number, step: (progress: number) => void): Promise<void> {
    return new Promise((finish) => {
      this.running.push({ duration, elapsed: 0, step, finish });
    });
  }

  /** Waits without moving anything. */
  wait(duration: number): Promise<void> {
    return this.run(duration, () => {});
  }

  /** Moves every running animation along by one frame, and settles those that finished. */
  advance(elapsedSeconds: number): void {
    for (const tween of [...this.running]) {
      tween.elapsed += elapsedSeconds;
      const progress = tween.duration <= 0 ? 1 : Math.min(1, tween.elapsed / tween.duration);
      tween.step(progress);
      if (progress === 1) {
        this.running.splice(this.running.indexOf(tween), 1);
        tween.finish();
      }
    }
  }

  /** Animations still running, for the dev panel. */
  count(): number {
    return this.running.length;
  }
}
