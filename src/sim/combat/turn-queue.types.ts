/** Someone who takes turns in a fight. */
export type TurnActor = {
  /** Id written on this actor's events. */
  id: string;
  /** How quickly this actor's turn comes back around. Must be above zero. */
  haste: number;
  /** Wins a tie that haste does not already decide. */
  hero?: boolean;
};

/** One actor waiting in the haste queue. */
export type QueuedActor = {
  /** Id written on this actor's events. */
  id: string;
  /** How quickly this actor's turn comes back around. */
  haste: number;
  /** Wins a tie that haste does not already decide. */
  hero: boolean;
  /** When this actor may act again. Lower goes first. */
  time: number;
  /** Place in the original list. Breaks a tie the hero flag does not. */
  order: number;
};
