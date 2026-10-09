import type { MeadowMap } from "../../sim/field/map.types";
import { moveHeroAlongStick } from "../../sim/field/movement";
import type { Position, Stick } from "../../sim/field/movement.types";
import { FieldWalkPolicy } from "../../sim/field/policy.controller";
import type { Rng } from "../../sim/utils/rng.types";

/**
 * Walks the hero around the meadow until real input exists.
 *
 * The sim's fighter wander picks a stick and how long to hold it. Each step
 * moves one sim tick with the meadow's collision, so the hero slides along
 * water and mountains. Fights are not started yet.
 */
export class StandInWalkController {
  /** Where the hero is standing, in sim tiles. */
  private position: Position;

  /** The stick being held. */
  private stick: Stick = { x: 0, y: 0 };

  /** Ticks left before the wander picks again. */
  private ticksLeft = 0;

  /** The fighter's wander. */
  private readonly policy: FieldWalkPolicy;

  /** The meadow the hero collides with. */
  private readonly map: MeadowMap;

  /**
   * @param map The seeded meadow. The hero starts in the middle of its spawn tile.
   * @param rng Direction rolls for the wander.
   */
  constructor(map: MeadowMap, rng: Rng) {
    this.map = map;
    this.position = { x: map.spawn.x + 0.5, y: map.spawn.y + 0.5 };
    this.policy = new FieldWalkPolicy({ field: map, miniboss: map.miniboss, rng });
  }

  /** Where the hero stands before the first step. */
  start(): Position {
    return { ...this.position };
  }

  /** One sim tick. Returns where the hero ends up. */
  step(): Position {
    if (this.ticksLeft <= 0) {
      const choice = this.policy.chooseFighter();
      this.stick = choice.stick;
      this.ticksLeft = choice.ticks;
    }
    this.position = moveHeroAlongStick(this.position, this.stick, 1, this.map);
    this.ticksLeft -= 1;
    return { ...this.position };
  }
}
