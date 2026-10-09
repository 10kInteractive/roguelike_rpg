import type { Position } from "../sim/field/movement.types";

/**
 * Remembers the last two sim positions and blends between them.
 *
 * The sim moves the hero in 30 Hz jumps. Drawing the blend instead of the
 * latest position makes the walk smooth at any display rate, one step behind.
 */
export class PositionInterpolator {
  /** The position one sim step ago. */
  private previous: Position;

  /** The position after the latest sim step. */
  private current: Position;

  /** @param start Where the hero stands before the first step. */
  constructor(start: Position) {
    this.previous = { ...start };
    this.current = { ...start };
  }

  /** Records the position after a sim step. The old latest becomes the previous. */
  push(next: Position): void {
    this.previous = this.current;
    this.current = { ...next };
  }

  /** The position to draw. 0 is the previous step, 1 is the latest. */
  at(blend: number): Position {
    return {
      x: this.previous.x + (this.current.x - this.previous.x) * blend,
      y: this.previous.y + (this.current.y - this.previous.y) * blend,
    };
  }

  /** How far the latest sim step moved, east and north. Zero when the hero stood still. */
  lastStep(): Position {
    return { x: this.current.x - this.previous.x, y: this.current.y - this.previous.y };
  }

  /** The latest sim position, with no blending. */
  latest(): Position {
    return { ...this.current };
  }
}
