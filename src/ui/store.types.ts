import type { SimEvent, Snapshot } from "../sim/game.types";
import type { MenuRow } from "./commands";

/** What the overlay can see. The sim stays the authority. */
export type UiState = {
  /** The sim as of the latest action. Null until a run starts. */
  snapshot: Snapshot | null;
  /** Events the view has not played yet, oldest first. */
  pending: SimEvent[];
  /** The command window's rows. Null while it is closed. */
  commands: MenuRow[] | null;
};
