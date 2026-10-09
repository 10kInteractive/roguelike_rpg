import type { SimEvent, Snapshot } from "../sim/game.types";

/** What the overlay can see. The sim stays the authority. */
export type UiState = {
  /** The sim as of the latest action. Null until a run starts. */
  snapshot: Snapshot | null;
  /** Events the view has not played yet, oldest first. */
  pending: SimEvent[];
};
