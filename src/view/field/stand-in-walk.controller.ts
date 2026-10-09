import { EncounterWalkController } from "../../sim/field/encounters.controller";
import type { EncounterTables, Miniboss } from "../../sim/field/encounters.types";
import type { MeadowMap } from "../../sim/field/map.types";
import type { Stick } from "../../sim/field/movement.types";
import { FieldWalkPolicy } from "../../sim/field/policy.controller";
import type { Rng } from "../../sim/utils/rng.types";
import type { WalkStep } from "./stand-in-walk.types";

/**
 * Walks the hero around the meadow until real input exists.
 *
 * The sim's grinder picks a stick and how long to hold it: a wander below
 * level 5, then the shortest walk to the miniboss. Each step moves one sim
 * tick with the meadow's collision and rolls encounters as it goes. A fight
 * cuts the hold short, the same way the headless grinder run does, so a seed
 * walks the same route on screen as in the sweep.
 */
export class StandInWalkController {
  /** Moves the hero and rolls each tile's encounter. */
  private readonly encounters: EncounterWalkController;

  /** The grinder's walk. */
  private readonly policy: FieldWalkPolicy;

  /** The stick being held. */
  private stick: Stick = { x: 0, y: 0 };

  /** Ticks left before the grinder picks again. */
  private ticksLeft = 0;

  constructor(input: {
    /** The seeded meadow. The hero starts in the middle of its spawn tile. */
    map: MeadowMap;
    /** Encounter rates for grass, forest, and path. */
    tables: EncounterTables;
    /** Tiles that must pass between fights. */
    minDistance: number;
    /** The circle that starts the miniboss fight. */
    miniboss: Miniboss;
    /** Encounter rolls. The pack fights draw their potion drops from it too. */
    fieldRng: Rng;
    /** Wander directions. The fights draw their action picks from it too. */
    choiceRng: Rng;
  }) {
    this.encounters = new EncounterWalkController({
      position: { x: input.map.spawn.x + 0.5, y: input.map.spawn.y + 0.5 },
      field: input.map,
      tables: input.tables,
      minDistance: input.minDistance,
      rng: input.fieldRng,
      miniboss: input.miniboss,
    });
    this.policy = new FieldWalkPolicy({
      field: input.map,
      miniboss: input.miniboss.tile,
      rng: input.choiceRng,
    });
  }

  /** Where the hero stands before the first step. */
  start(): WalkStep["position"] {
    return { ...this.encounters.position };
  }

  /**
   * One sim tick. Returns where the hero ends up, and the fight if one started.
   *
   * @param level The hero's level, which decides when the grinder heads for the miniboss.
   */
  step(level: number): WalkStep {
    if (this.ticksLeft <= 0) {
      const choice = this.policy.chooseGrinder(this.encounters.position, level);
      this.stick = choice.stick;
      this.ticksLeft = choice.ticks;
    }
    const held = this.encounters.holdStick(this.stick, 1);
    this.ticksLeft -= 1;

    // A fight ends the hold. The grinder picks a new stick after it.
    const encounter = held.events[0];
    if (encounter) this.ticksLeft = 0;
    return { position: { ...this.encounters.position }, distance: held.distance, encounter };
  }
}
