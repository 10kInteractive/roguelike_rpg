import type { Fighter } from "../combat/fight.types";
import type { LevelRules } from "../combat/level";
import type { EncounterTables, Miniboss } from "../field/encounters.types";
import type { MeadowMap } from "../field/map";
import type { Rng } from "../rng";

/** A mob the field can start a fight with, plus its potion drop. */
export type RunMob = {
  /** Stats and actions the fight uses. */
  fighter: Fighter;
  /** Drop chance after a win. A missing chance never drops. */
  potionDrop?: number;
};

/** What one grinder run is worth to the balance sweep. */
export type FieldRunResult = {
  /** Win when the miniboss falls. Lose when the hero falls. */
  outcome: "win" | "lose";
  /** Level when the miniboss fight started. Absent if the hero never arrived. */
  bossLevel?: number;
  /** Fights started, including a flee and the miniboss. */
  fights: number;
  /** Tiles the hero actually walked. */
  distance: number;
  /** Estimated seconds, from decisions, enemy actions, fights, and walking. */
  playSeconds: number;
  /** Potions the hero drank. */
  potionsUsed: number;
  /** Mob that defeated the hero. */
  killedBy?: string;
};

/** The hero as the run carries them from one fight to the next. */
export type HeroState = {
  /** Id written on the hero's events. */
  id: string;
  /** Hit points right now. */
  hp: number;
  /** Hit points a heal or a level-up fills to. */
  maxHp: number;
  /** Magic points right now. */
  mp: number;
  /** Magic points a level-up fills to. */
  maxMp: number;
  /** Strength. */
  str: number;
  /** Defense. */
  def: number;
  /** Magic. */
  mag: number;
  /** How quickly the hero's turn comes back around. */
  haste: number;
  /** Potions still carried. */
  potions: number;
  /** Current level. */
  level: number;
  /** XP toward the next level. */
  xp: number;
};

/** Damage, flee, and potion numbers copied from the bundle for each fight. */
export type CombatRules = {
  /** Time added per action before dividing by haste. */
  turnBase: number;
  /** Inclusive lower bound of the damage spread. */
  spreadMin: number;
  /** Exclusive upper bound of the damage spread. */
  spreadMax: number;
  /** A hit crits when the roll is below this. */
  critChance: number;
  /** Applied to a crit, then rounded down. */
  critMultiplier: number;
  /** Applied to damage taken while defending, then rounded down. */
  defendMultiplier: number;
  /** Hit points restored by one potion, before the maximum. */
  potionHeal: number;
  /** Flee chance before the haste bonus. */
  fleeBase: number;
  /** Added per point of hero haste over the enemy's haste. */
  fleePerPoint: number;
  /** Lowest flee chance. */
  fleeMin: number;
  /** Highest flee chance. */
  fleeMax: number;
  /** Magic damage multiplier against a weakness. */
  weaknessMultiplier: number;
  /** Magic damage multiplier against a resistance. */
  resistanceMultiplier: number;
};

/** Everything one grinder run needs: the meadow, the mobs, the hero, and the bundle's numbers. */
export type GrinderRunInput = {
  /** Seed for the field rolls, the choice rolls, and the combat rolls. */
  seed: number;
  /** Meadow the hero crosses, including the spawn tile. */
  map: MeadowMap;
  /** Circle that starts the miniboss fight. */
  miniboss: Miniboss;
  /** Encounter rate and packs for grass, forest, and path. */
  tables: EncounterTables;
  /** Tiles that must pass between fights. */
  minDistance: number;
  /** Strider at the start of the run. */
  hero: Fighter;
  /** Every mob an encounter can name. */
  mobs: ReadonlyMap<string, RunMob>;
  /** Damage, flee, and potion numbers for each fight. */
  combat: CombatRules;
  /** XP thresholds and growth. */
  leveling: LevelRules;
  /** Field, choice, and combat rolls. Defaults to three generators from `seed`. */
  rngs?: {
    /** Encounter rates, pack picks, counts, and potion drops. */
    field: Rng;
    /** Wander directions and enemy action picks. */
    choice: Rng;
    /** Damage, crits, and flee rolls. */
    combat: Rng;
  };
};
