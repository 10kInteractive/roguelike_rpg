/** The numbers on the victory and game over screens. Play time is clocked by the UI. */
export type RunStats = {
  /** Seed this run was drawn from. */
  seed: number;
  /** Fights the hero won. */
  fightsWon: number;
  /** Fights the hero fled. */
  fightsFled: number;
  /** Level the hero has reached. */
  level: number;
  /** Damage the hero dealt. */
  damageDealt: number;
  /** Damage the hero took. */
  damageTaken: number;
  /** Potions the hero drank, including one that healed nothing. */
  potionsUsed: number;
  /** Tiles the hero actually walked. */
  distance: number;
  /** Mob that defeated the hero. Absent until the run is over. */
  killedBy?: string;
};
