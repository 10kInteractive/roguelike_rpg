import type { FightEvent, Fighter, FightInput } from "../combat/fight.types";
import type { LevelRules } from "../combat/utils/level.types";
import type { Rng } from "../utils/rng.types";
import type { CombatRules, RunMob } from "./run.types";

/** How one fight, or a whole pack, ended for the hero. */
export type PackOutcome = "win" | "lose" | "flee";

/** Everything a run of pack fights needs: the hero, the mobs, the numbers, and the rolls. */
export type PackFightInput = {
  /** The hero before the first pack. Later packs start where the last one left them. */
  hero: Fighter;
  /** Every mob a pack can name. */
  mobs: ReadonlyMap<string, RunMob>;
  /** Damage, flee, and potion numbers for each fight. */
  combat: CombatRules;
  /** XP thresholds and growth. */
  leveling: LevelRules;
  /** The hero's turn choices. */
  heroPolicy: NonNullable<FightInput["heroPolicy"]>;
  rngs: {
    /** Potion drops after a win. The run shares its field rolls here. */
    drops: Rng;
    /** Enemy action picks. */
    choice: Rng;
    /** Damage, crits, and flee rolls. */
    combat: Rng;
  };
};

/** One mob's fight inside a pack. */
export type PackFight = {
  /** The mob fought, such as `mob.slime`. */
  mobId: string;
  /** Every event of the fight, in order. */
  events: FightEvent[];
  /** How this fight ended. */
  outcome: PackOutcome;
  /** True when the mob dropped a potion after the hero won. */
  potionDropped: boolean;
};

/** What one pack did: each fight in order, and how the pack ended. */
export type PackResult = {
  /** Win when every mob fell, lose when the hero did, flee when the hero escaped. */
  outcome: PackOutcome;
  /** Fights in the order they were played. A flee or a defeat ends the list. */
  fights: PackFight[];
};
