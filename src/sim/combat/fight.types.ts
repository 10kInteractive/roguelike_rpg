import type { Rng } from "../rng";
import type { Element } from "./damage";
import type { LevelEvent, LevelRules } from "./level";
import type { HeroVitals, SpellChoice } from "./policy";
import type { Weighted } from "./weighted";

/** One combatant, the hero or a mob, as a fight sees them. */
export type Fighter = {
  /** Id written on this actor's events, such as `hero` or `mob.slime`. */
  id: string;
  /** Hit points right now. Zero defeats this actor. */
  hp: number;
  /** Healing stops here. Defaults to the starting HP. */
  maxHp?: number;
  /** Potions carried. Defaults to zero. */
  potions?: number;
  /** Spell damage. Defaults to zero. */
  mag?: number;
  /** Magic points. Defaults to zero. */
  mp?: number;
  /** Healing MP stops here. Defaults to the starting MP. */
  maxMp?: number;
  /** Defaults to 1. */
  level?: number;
  /** XP toward the next level. Defaults to zero. */
  xp?: number;
  /** Granted when this actor is defeated. Defaults to zero. */
  xpReward?: number;
  /** Strength. Physical damage starts here. */
  str: number;
  /** Defense. Physical damage subtracts half of this. */
  def: number;
  /** How quickly this actor's turn comes back around. */
  haste: number;
  /** Element that deals extra damage to this actor. */
  weak?: Element;
  /** Element that deals reduced damage to this actor. */
  resists?: Element;
  /** Used when this actor has no scripted action for the turn. */
  actions?: EnemyAction[];
  /** The player's fighter. Wins a haste tie, and is the one who can flee. */
  hero?: boolean;
  /** A miniboss fight cannot be fled. */
  miniboss?: boolean;
};

/** A combat command: Fight, Defend, a potion, or Run. */
export type TurnAction = "fight" | "defend" | "potion" | "flee";

/** One entry on a mob's action list. The weight is its share of the pick. */
export type EnemyAction =
  | ({ type: "fight" | "defend" } & Weighted)
  | ({ type: "grind"; multiplier: number } & Weighted)
  | ({
      type: "spell";
      spellId: "spell.ember" | "spell.frost";
      element: Element;
      power: number;
      cost: number;
    } & Weighted);

/** One thing that happened in a fight, in the order it happened. */
export type FightEvent =
  | {
      /** A physical swing. The hit's damage is the next event. */
      type: "attacked";
      /** Who swung. */
      actorId: string;
      /** Who was swung at. */
      targetId: string;
    }
  | {
      /** This actor is guarding until their next turn. */
      type: "defended";
      /** Who raised the guard. */
      actorId: string;
    }
  | {
      /** A potion was drunk, or Item was pressed with an empty stack. */
      type: "itemUsed";
      /** Who drank. */
      actorId: string;
      /** Always the potion in prototype one. */
      itemId: "item.potion";
      /** Hit points restored. Zero at full HP, and zero when the stack was empty. */
      amount: number;
      /** Hit points after the drink. */
      hp: number;
      /** Potions left after the drink. */
      remaining: number;
    }
  | {
      /** Run was tried. Success ends the fight. */
      type: "fleeAttempted";
      /** Who tried to run. Only the hero can. */
      actorId: string;
      /** True when the roll was below the chance. A miniboss attempt is never a success. */
      success: boolean;
      /** The chance that was rolled against. Zero for a miniboss, and that attempt spends no roll. */
      chance: number;
    }
  | {
      /** A spell was paid for and resolved. */
      type: "spellCast";
      /** Who cast. */
      actorId: string;
      /** Ember or Frost. */
      spellId: "spell.ember" | "spell.frost";
      /** Who was hit. */
      targetId: string;
      /** Magic points left after paying. */
      mp: number;
    }
  | {
      /** A physical swing that will be multiplied. The hit's damage is the next event. */
      type: "grind";
      /** Who swung. */
      actorId: string;
      /** Who was swung at. */
      targetId: string;
      /** Applied after the crit and before Defend. Prototype one's sentinel uses 1.5. */
      multiplier: number;
    }
  | {
      /** Hit points just lost. */
      type: "damaged";
      /** Who landed the hit. */
      actorId: string;
      /** Who lost the hit points. */
      targetId: string;
      /** Hit points lost, after the spread, a crit, a grind, and Defend. */
      amount: number;
      /** Hit points left after this hit. */
      targetHp: number;
      /** True when a physical hit rolled under the crit chance. Spells never crit. */
      critical: boolean;
    }
  | {
      /** This actor reached zero hit points. */
      type: "actorDefeated";
      /** Who fell. */
      actorId: string;
    }
  | LevelEvent;

/** Everything a fight needs: the two fighters, the rolls, and the bundle's numbers. */
export type FightInput = {
  /** The player's fighter. */
  hero: Fighter;
  /** The mob. */
  enemy: Fighter;
  /** Damage, crit, and flee rolls. */
  rng: Rng;
  /** Time added per action before dividing by haste. */
  turnBase: number;
  /** Inclusive lower bound of the damage spread. */
  spreadMin: number;
  /** Exclusive upper bound of the damage spread. */
  spreadMax: number;
  /** A hit crits when the roll is below this. Prototype one uses 0.05. */
  critChance: number;
  /** Applied to a crit, then rounded down. Prototype one uses 1.5. */
  critMultiplier: number;
  /** Applied to damage taken while defending, then rounded down. Prototype one uses 0.5. */
  defendMultiplier: number;
  /** HP restored by one potion, before the maximum. Prototype one uses 25. */
  potionHeal: number;
  /** Flee chance before the haste bonus. Prototype one uses 0.5. */
  fleeBase: number;
  /** Added per point of hero haste over the enemy's haste. Prototype one uses 0.05. */
  fleePerPoint: number;
  /** Lowest flee chance. Prototype one uses 0.1. */
  fleeMin: number;
  /** Highest flee chance. Prototype one uses 0.9. */
  fleeMax: number;
  /** Magic damage multiplier against a weakness. Prototype one uses 1.5. */
  weaknessMultiplier: number;
  /** Magic damage multiplier against a resistance. Prototype one uses 0.5. */
  resistanceMultiplier: number;
  /** When set, a defeated enemy grants XP and may level the hero. */
  leveling?: LevelRules;
  /** Chooses an unscripted hero turn from current HP, MP, and the target. */
  heroPolicy?: (
    hero: HeroVitals & { mp: number },
    target: { weak?: Element },
  ) => TurnAction | SpellChoice;
  /** Enemy action picks. Defaults to the combat RNG. */
  choiceRng?: Rng;
  /** One entry per hero turn. Turns past the end Fight. */
  heroActions?: ScriptedAction[];
  /** One entry per enemy turn. Turns past the end Fight. */
  enemyActions?: ScriptedAction[];
};

/** One scripted turn: a command, a cast, or a grind. Turns past the end of the list Fight. */
export type ScriptedAction = TurnAction | SpellChoice | { type: "grind"; multiplier: number };
