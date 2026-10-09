import type { Position, Stick } from "../../sim/field/movement.types";
import { FieldWalkPolicy } from "../../sim/field/policy.controller";
import type { GameSimController } from "../../sim/game.controller";
import type { Rng } from "../../sim/utils/rng.types";
import type { WalkStep } from "./stand-in-walk.types";

/**
 * Walks the hero around the meadow until real input exists.
 *
 * The grinder picks a stick and how long to hold it: a wander below level 5,
 * then the shortest walk to the miniboss. Each step is one move sent to the
 * sim, so the encounter rolls and the fight that stops the walk belong to
 * the same run as the combat commands.
 */
export class StandInWalkController {
  /** The run. A move goes through its `act`. */
  private readonly sim: GameSimController;

  /** The grinder's walk. */
  private readonly policy: FieldWalkPolicy;

  /** The stick being held. */
  private stick: Stick = { x: 0, y: 0 };

  /** Ticks left before the grinder picks again. */
  private ticksLeft = 0;

  /**
   * @param sim The run being played. The hero starts where the sim placed them.
   * @param choiceRng Wander rolls. The sim's enemy picks spend from this same generator.
   */
  constructor(sim: GameSimController, choiceRng: Rng) {
    const field = sim.observe().field;
    this.sim = sim;
    this.policy = new FieldWalkPolicy({
      field: field.map,
      miniboss: field.miniboss.tile,
      rng: choiceRng,
    });
  }

  /** Where the hero stands before the first step. */
  start(): Position {
    return { ...this.sim.observe().field.position };
  }

  /** One sim tick. Returns where the hero ends up, and the events if a fight started. */
  step(): WalkStep {
    if (this.ticksLeft <= 0) {
      const snapshot = this.sim.observe();
      const choice = this.policy.chooseGrinder(snapshot.field.position, snapshot.hero.level);
      this.stick = choice.stick;
      this.ticksLeft = choice.ticks;
    }

    const events = this.sim.act({ type: "move", x: this.stick.x, y: this.stick.y, ticks: 1 });
    this.ticksLeft -= 1;

    // A fight ends the hold. The grinder picks a new stick after it.
    if (events.length > 0) this.ticksLeft = 0;
    return { position: { ...this.sim.observe().field.position }, events };
  }
}
