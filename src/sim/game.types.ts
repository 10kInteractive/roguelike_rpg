import type { Bundle } from "../content/schema";
import type { FightEvent } from "./combat/fight.types";
import type { EncounterEvent, Miniboss } from "./field/encounters.types";
import type { MeadowMap } from "./field/map.types";
import type { Position, Stick } from "./field/movement.types";
import type { HeroState } from "./run/run.types";
import type { RunStats } from "./run/stats.types";
import type { Rng } from "./utils/rng.types";

/** One thing the player can do. A move's axes are integers from −64 to 64. */
export type Action =
  | {
      /** Walk. `ticks` defaults to one sim step. The hold stops early when a fight starts. */
      type: "move";
      /** Stick pushed east, from −64 to 64. */
      x: number;
      /** Stick pushed north, from −64 to 64. */
      y: number;
      /** How many steps to hold the stick. The harness batches; the browser sends one. */
      ticks?: number;
    }
  | {
      /** Fight the mob whose turn it is. */
      type: "fight";
      /** The mob's id. */
      target: string;
    }
  | {
      /** Cast a known spell the hero can pay for. */
      type: "cast";
      /** `spell.ember` or `spell.frost`. */
      spell: "spell.ember" | "spell.frost";
      /** The mob's id. */
      target: string;
    }
  | {
      /** Drink a potion. */
      type: "item";
      /** The only item in prototype one. */
      item: "item.potion";
    }
  | {
      /** Guard until the hero's next turn. */
      type: "defend";
    }
  | {
      /** Try to leave the fight. A miniboss attempt fails. */
      type: "run";
    };

/** What one action caused, in the order it happened. Walking itself is not an event. */
export type SimEvent =
  | EncounterEvent
  | FightEvent
  | {
      /** The hero's turn is open. The command window waits here. */
      type: "turnStarted";
      /** Whose turn. The hero's, since enemy turns play out inside the action. */
      actorId: string;
    }
  | {
      /** A defeated mob left a potion. */
      type: "itemDropped";
      /** The potion. */
      itemId: "item.potion";
    }
  | {
      /** This mob's fight is over. */
      type: "combatEnded";
      /** Win when the mob falls, flee when the hero escapes, lose when the hero falls. */
      outcome: "win" | "flee" | "lose";
    }
  | {
      /** The miniboss fell. The run is won. */
      type: "victory";
    }
  | {
      /** The hero fell. The run is lost. */
      type: "gameOver";
      /** The mob that landed the last hit. */
      killedBy: string;
    };

/** One fighter as a snapshot shows them. */
export type CombatantView = {
  /** Id written on this fighter's events. */
  id: string;
  /** Hit points right now. */
  hp: number;
  /** Hit points a heal fills to. */
  maxHp: number;
  /** Magic points right now. */
  mp: number;
  /** Magic points a level-up fills to. */
  maxMp: number;
};

/** What the player can see right now. */
export type Snapshot = {
  /** Where the run is: walking, in a fight, won, or lost. */
  mode: "field" | "combat" | "victory" | "gameOver";
  /** The hero's stats, counting the fight underway. */
  hero: HeroState;
  /** The meadow and where the hero stands on it. */
  field: {
    /** The seeded meadow. Its tiles do not change during a run. */
    map: MeadowMap;
    /** Where the hero stands, in tile units. */
    position: Position;
    /** The last stick pushed. South until the first one. */
    facing: Stick;
    /** The circle that starts the miniboss fight. */
    miniboss: Miniboss;
    /** Ticks left before a random fight can roll. Zero when the hold is over. */
    guardTicks: number;
  };
  /** The fight underway. Absent while the hero is walking, and after the run ends. */
  combat?: {
    /** The mob being fought. */
    mobId: string;
    /** That mob's points. */
    enemy: CombatantView;
    /** Who acts next, the hero's open turn first. */
    turnOrder: string[];
  };
  /** The scoreboard so far. */
  stats: RunStats;
};

/** What a run is started from. */
export type CreateSimOptions = {
  /** The content the run plays. */
  bundle: Bundle;
  /** Seed for the meadow and, unless `rngs` is given, the three rolls. */
  seed: number;
  /**
   * Field, choice, and combat rolls. Defaults to three generators from `seed`.
   * A stand-in that shares `choice` spends its wander rolls on the same sequence as the enemy's picks.
   */
  rngs?: {
    /** Encounter rates, pack picks, counts, and potion drops. */
    field: Rng;
    /** Enemy action picks. A stand-in's wander spends from here too. */
    choice: Rng;
    /** Damage, crits, and flee rolls. */
    combat: Rng;
  };
};
