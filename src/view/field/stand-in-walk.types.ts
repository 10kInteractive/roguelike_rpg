import type { EncounterEvent } from "../../sim/field/encounters.types";
import type { Position } from "../../sim/field/movement.types";

/** What one stand-in sim tick did. */
export type WalkStep = {
  /** Where the hero ends up, in sim tiles. */
  position: Position;
  /** Tiles moved this tick. */
  distance: number;
  /** The fight that started on this tick, if one did. */
  encounter?: EncounterEvent;
};
