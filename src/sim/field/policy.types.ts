import type { Stick } from "./movement.types";

/** A stick held for a batch of field ticks. */
export type WalkChoice = {
  /** Integer stick from −64 to 64 on each axis. */
  stick: Stick;
  /** How many ticks to hold the stick. */
  ticks: number;
};
