/** Who chooses the hero's actions. `ai` is the stand-in. `human` is the player. */
export type GameLoopMode = "human" | "ai";

/** What the run is doing now: walking the field, in a fight, or over. */
export type GameLoopPhase = "walking" | "fighting" | "won" | "lost";

/** How a run ended. */
export type RunEnd = {
  /** Win when the miniboss falls. Lose when the hero does. */
  outcome: "win" | "lose";
  /** The hero's level: after the miniboss on a win, going into the last fight on a loss. */
  level: number;
  /** Mobs fought, counting each mob in a pack. */
  fights: number;
  /** The mob that defeated the hero. */
  killedBy?: string;
};
