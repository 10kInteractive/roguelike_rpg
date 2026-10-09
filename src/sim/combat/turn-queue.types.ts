/** Someone who takes turns in a fight. */
export type TurnActor = {
  /** Id written on this actor's events. */
  id: string;
  /** How quickly this actor's turn comes back around. Must be above zero. */
  haste: number;
  /** Wins a tie that haste does not already decide. */
  hero?: boolean;
};
