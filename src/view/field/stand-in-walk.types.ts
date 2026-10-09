import type { Position } from "../../sim/field/movement.types";
import type { SimEvent } from "../../sim/game.types";

/** What one stand-in sim tick did. */
export type WalkStep = {
  /** Where the hero ends up, in sim tiles. */
  position: Position;
  /** What the move caused. Empty while the hero is still walking. */
  events: readonly SimEvent[];
};

/** Something that walks the hero one sim tick at a time. */
export type FieldWalker = {
  /** Where the hero stands before the first step. */
  start(): Position;
  /** One sim tick. */
  step(): WalkStep;
};
