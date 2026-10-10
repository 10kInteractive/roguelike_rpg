import { gamepad } from "../../input/gamepad.controller";
import type { KeyboardController } from "../../input/keyboard.controller";
import type { Position, Stick } from "../../sim/field/movement.types";
import type { GameSimController } from "../../sim/game.controller";
import type { WalkStep } from "./stand-in-walk.types";

/**
 * Walks the hero from the keys or the pad held right now.
 *
 * Each sim tick sends one move. A still stick stays put and rolls nothing.
 * A fight comes back on the tick a roll or the miniboss says so. A key owns
 * its axis. The pad still moves the other one.
 */
export class PlayerWalkController {
  /** The run. A move goes through its `act`. */
  private readonly sim: GameSimController;

  /** Keys held right now. */
  private readonly keys: KeyboardController;

  /**
   * @param sim The run being played.
   * @param keys The stick for this tick.
   */
  constructor(sim: GameSimController, keys: KeyboardController) {
    this.sim = sim;
    this.keys = keys;
  }

  /** Where the hero stands before the first step. */
  start(): Position {
    return { ...this.sim.observe().field.position };
  }

  /** One sim tick. Returns where the hero ends up, and the events if a fight started. */
  step(): WalkStep {
    const stick = this.stick();
    const events = this.sim.act({ type: "move", x: stick.x, y: stick.y, ticks: 1 });
    return { position: { ...this.sim.observe().field.position }, events };
  }

  /** A key owns its axis. The pad fills an axis no key is holding. */
  private stick(): Stick {
    const keys = this.keys.stick();
    const pad = gamepad.stick();
    return {
      x: keys.x !== 0 ? keys.x : pad.x,
      y: keys.y !== 0 ? keys.y : pad.y,
    };
  }
}
