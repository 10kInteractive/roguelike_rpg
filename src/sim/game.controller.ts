import { heroFighterFromBundle } from "../content/fighters";
import {
  combatRulesFromBundle,
  encounterTablesFromBundle,
  knownSpellsFromBundle,
  levelRulesFromBundle,
  runMobsFromBundle,
} from "../content/rules";
import { OneOnOneFightController } from "./combat/fight.controller";
import type { FightEvent, Fighter, ScriptedAction } from "./combat/fight.types";
import type { KnownSpell } from "./combat/policy.types";
import type { LevelRules } from "./combat/utils/level.types";
import { EncounterWalkController } from "./field/encounters.controller";
import type { EncounterEvent, Miniboss } from "./field/encounters.types";
import { openingGuardTicks, returnGuardTicks } from "./field/governor.constants";
import { createSeededMeadow } from "./field/map";
import type { MeadowMap } from "./field/map.types";
import { stickLimit } from "./field/movement.constants";
import type { Stick } from "./field/movement.types";
import { startingFacing, turnOrderCount } from "./game.constants";
import type { Action, CombatantView, CreateSimOptions, SimEvent, Snapshot } from "./game.types";
import type { CombatRules, HeroState, RunMob } from "./run/run.types";
import { RunStatistics } from "./run/stats.controller";
import { SeededRandomGenerator } from "./utils/rng.controller";
import type { Rng } from "./utils/rng.types";

/**
 * One run, played one action at a time.
 *
 * A move walks the meadow and rolls encounters. The action that starts a
 * fight also plays up to the hero's first decision. A combat action plays
 * the hero's choice and every enemy turn until the next decision, and a
 * fallen mob's consequences, including the next mob stepping in. The run
 * ends when the miniboss falls or the hero does.
 */
export class GameSimController {
  /** The seeded meadow. */
  private readonly map: MeadowMap;

  /** Walks the hero and rolls each tile. */
  private readonly encounters: EncounterWalkController;

  /** The circle that starts the miniboss fight. */
  private readonly miniboss: Miniboss;

  /** Every mob an encounter can name. */
  private readonly mobs: ReadonlyMap<string, RunMob>;

  /** Damage, flee, and potion numbers. */
  private readonly combat: CombatRules;

  /** XP thresholds and growth. */
  private readonly leveling: LevelRules;

  /** Spells the hero can cast. */
  private readonly spells: readonly KnownSpell[];

  /** Encounter rolls and potion drops. */
  private readonly fieldRng: Rng;

  /** Enemy action picks. */
  private readonly choiceRng: Rng;

  /** Damage, crits, and flee rolls. */
  private readonly combatRng: Rng;

  /** The scoreboard. */
  private readonly stats: RunStatistics;

  /** The hero between fights. A fight underway keeps its own copy. */
  private hero: HeroState;

  /** The last stick pushed. South until the first one. */
  private facing: Stick = { ...startingFacing };

  /** Where the run is. */
  private mode: Snapshot["mode"] = "field";

  /** The fight underway. */
  private fight: OneOnOneFightController | null = null;

  /** Events of the fight underway, for the scoreboard once it ends. */
  private fightEvents: FightEvent[] = [];

  /** The mob being fought. */
  private mobId = "";

  /** The pack still to fight. Null while the hero is walking. */
  private pack: { ids: string[]; index: number; miniboss: boolean } | null = null;

  /** Encounter indices that have already fallen. */
  private fallen = new Set<number>();

  /** Hit points left on a mob who stepped back. Keyed by encounter index. */
  private wounds = new Map<number, { hp: number; mp: number }>();

  /** @param options The bundle, the seed, and the rolls. */
  constructor(options: CreateSimOptions) {
    const biome = options.bundle.biomes[0];
    if (!biome) throw new Error("The bundle has no biome");

    const hero = heroFighterFromBundle(options.bundle.hero);
    this.map = createSeededMeadow({
      seed: options.seed,
      width: biome.width,
      height: biome.height,
      minibossDistance: biome.minibossDistance,
    });
    this.miniboss = {
      tile: this.map.miniboss,
      radius: biome.minibossRadius,
      id: biome.miniboss,
      front: biome.minibossFront,
    };
    this.mobs = runMobsFromBundle(options.bundle);
    this.combat = combatRulesFromBundle(options.bundle);
    this.leveling = levelRulesFromBundle(options.bundle);
    this.spells = knownSpellsFromBundle(options.bundle);
    this.hero = this.toHero(hero);
    this.stats = new RunStatistics(options.seed, this.hero.level, this.hero.id);

    const rngs = options.rngs;
    this.fieldRng = rngs?.field ?? new SeededRandomGenerator(options.seed);
    this.choiceRng = rngs?.choice ?? new SeededRandomGenerator(options.seed);
    this.combatRng = rngs?.combat ?? new SeededRandomGenerator(options.seed);
    this.encounters = new EncounterWalkController({
      position: { x: this.map.spawn.x + 0.5, y: this.map.spawn.y + 0.5 },
      field: this.map,
      tables: encounterTablesFromBundle(options.bundle),
      minDistance: options.bundle.rules.minEncounterDistance,
      rng: this.fieldRng,
      miniboss: this.miniboss,
      openingGuardTicks,
    });
  }

  /** What the player can see right now. */
  observe(): Snapshot {
    const snapshot: Snapshot = {
      mode: this.mode,
      hero: this.heroNow(),
      field: {
        map: this.map,
        position: { ...this.encounters.position },
        facing: { ...this.facing },
        miniboss: this.miniboss,
        guardTicks: this.encounters.guardTicks(),
      },
      stats: this.stats.snapshot(),
    };

    // The open turn leads the list. The queue holds everyone after it.
    if (this.mode === "combat" && this.fight) {
      const pack = this.pack;
      snapshot.combat = {
        mobId: this.mobId,
        enemy: this.enemyView(),
        turnOrder: [this.hero.id, ...this.fight.upcoming(turnOrderCount - 1)],
        index: pack?.index ?? 0,
        line: pack ? pack.ids.flatMap((_, index) => (this.fallen.has(index) ? [] : [index])) : [],
      };
    }
    return snapshot;
  }

  /**
   * What the player may do right now.
   * On the field, the one move action's axes are the limits, ±64, not a stick to hold.
   */
  legalActions(): Action[] {
    if (this.mode === "field") return [{ type: "move", x: stickLimit, y: stickLimit }];
    if (this.mode !== "combat") return [];

    const hero = this.heroNow();
    const actions: Action[] = [{ type: "fight", target: this.mobId }];
    for (const spell of this.spells) {
      if (hero.mp < spell.cost) continue;
      actions.push({ type: "cast", spell: spell.id, target: this.mobId });
    }
    if (hero.potions > 0) actions.push({ type: "item", item: "item.potion" });
    actions.push({ type: "defend" }, { type: "run" });
    return actions;
  }

  /**
   * Fights a different living mob. The one who steps back keeps the hit points
   * they have now. The hero's open turn stays open.
   *
   * @param index Where that mob stands in the pack. The lead is 0.
   */
  face(index: number): void {
    const pack = this.pack;
    const fight = this.fight;
    if (!pack || !fight?.awaitingHero()) throw new Error("That action is not available");
    if (!Number.isInteger(index) || index < 0 || index >= pack.ids.length) {
      throw new Error("That action is not available");
    }
    if (this.fallen.has(index)) throw new Error("That action is not available");
    if (index === pack.index) return;

    // The mob stepping back keeps the hit points the fight has dealt them.
    const current = fight.fighters().enemy;
    this.wounds.set(pack.index, { hp: current.hp, mp: current.mp });
    pack.index = index;
    this.mobId = pack.ids[index] ?? this.mobId;
    fight.face(this.mobFighter(index));
  }

  /**
   * Plays one action and returns everything it caused, up to the next decision.
   *
   * @param action A move on the field, or a combat command while a fight is open.
   */
  act(action: Action): SimEvent[] {
    if (this.mode === "victory" || this.mode === "gameOver") throw new Error("The run is over");
    if (this.mode === "field") return this.actMove(action);
    return this.actCombat(action);
  }

  /** Holds the stick, and starts a fight when a roll or the miniboss says so. */
  private actMove(action: Action): SimEvent[] {
    if (action.type !== "move") throw new Error("That action is not available");
    const ticks = action.ticks ?? 1;
    if (!this.axis(action.x) || !this.axis(action.y) || !Number.isInteger(ticks) || ticks < 1) {
      throw new Error("A move needs stick axes from -64 to 64 and a whole number of steps");
    }

    const held = this.encounters.holdStick({ x: action.x, y: action.y }, ticks);
    if (action.x !== 0 || action.y !== 0) this.facing = { x: action.x, y: action.y };
    this.stats.addWalk(held.distance);

    const started = held.events[0];
    if (!started) return [];
    return this.beginPack(started);
  }

  /** The hero's command, then the enemy's turns, then the next mob when this one falls. */
  private actCombat(action: Action): SimEvent[] {
    const fight = this.fight;
    if (!fight?.awaitingHero() || !this.isLegal(action)) {
      throw new Error("That action is not available");
    }

    const events = fight.act(this.toScripted(action));
    this.fightEvents.push(...events);
    if (!fight.ended()) return [...events, { type: "turnStarted", actorId: this.hero.id }];
    return [...events, ...this.finishFight()];
  }

  /** Lines the pack up and plays to the first decision. */
  private beginPack(started: EncounterEvent): SimEvent[] {
    const ids = started.groups.flatMap((group) =>
      Array.from({ length: group.count }, () => group.id),
    );
    const first = ids[0];
    if (!first) throw new Error("An encounter needs a mob");

    this.pack = { ids, index: 0, miniboss: started.miniboss === true };
    this.fallen = new Set();
    this.wounds = new Map();
    return [started, ...this.openFight(0)];
  }

  /** Starts one mob's fight and plays until the hero must choose, or the fight is already over. */
  private openFight(index: number): SimEvent[] {
    const pack = this.pack;
    const mobId = pack?.ids[index];
    if (!pack || !mobId) throw new Error("An encounter needs a mob");

    this.mobId = mobId;
    pack.index = index;
    this.fightEvents = [];
    this.mode = "combat";
    this.fight = new OneOnOneFightController({
      hero: { ...this.hero, hero: true },
      enemy: this.mobFighter(index),
      rng: this.combatRng,
      choiceRng: this.choiceRng,
      ...this.combat,
      leveling: this.leveling,
    });

    const events = this.fight.start();
    this.fightEvents.push(...events);
    if (this.fight.ended()) return [...events, ...this.finishFight()];
    return [...events, { type: "turnStarted", actorId: this.hero.id }];
  }

  /** Scores the fight, rolls a drop, and either sends in the next mob or ends the pack. */
  private finishFight(): SimEvent[] {
    const fight = this.fight;
    const pack = this.pack;
    if (!fight || !pack) return [];

    const { hero, enemy } = fight.fighters();
    const outcome = hero.hp <= 0 ? "lose" : enemy.hp <= 0 ? "win" : "flee";
    this.hero = this.toHero(hero);

    // A drop is rolled only after a win, and only for a mob with a chance.
    const events: SimEvent[] = [];
    const drop = this.mobs.get(this.mobId)?.potionDrop;
    if (outcome === "win" && drop !== undefined && this.fieldRng.next() < drop) {
      this.hero.potions += 1;
      events.push({ type: "itemDropped", itemId: "item.potion" });
    }

    this.stats.addFight(this.fightEvents, this.mobId);
    events.push({ type: "combatEnded", outcome });
    this.fallen.add(pack.index);
    this.wounds.delete(pack.index);
    this.fight = null;
    this.fightEvents = [];

    if (outcome === "lose") {
      this.mode = "gameOver";
      this.pack = null;
      events.push({ type: "gameOver", killedBy: this.mobId });
      return events;
    }

    // The sentinel's fall ends the run. A mob in front of it does not.
    const bossFell = outcome === "win" && this.mobs.get(this.mobId)?.fighter.miniboss === true;
    const next = pack.ids.findIndex((_, slot) => !this.fallen.has(slot));
    if (outcome === "win" && next >= 0 && !bossFell) {
      events.push(...this.openFight(next));
      return events;
    }

    this.pack = null;
    this.fallen = new Set();
    this.wounds = new Map();
    if (outcome === "win" && pack.miniboss) {
      this.mode = "victory";
      events.push({ type: "victory" });
      return events;
    }

    this.mode = "field";
    if (outcome === "win") this.encounters.guard(returnGuardTicks);
    return events;
  }

  /** The hero's stats, from the fight while one is underway. */
  private heroNow(): HeroState {
    if (this.mode === "combat" && this.fight) return this.toHero(this.fight.fighters().hero);
    return { ...this.hero };
  }

  /** The mob at that place in the pack, with any hit points they kept while waiting. */
  private mobFighter(index: number): Fighter {
    const pack = this.pack;
    const id = pack?.ids[index];
    const mob = id ? this.mobs.get(id) : undefined;
    if (!pack || !mob) throw new Error("An encounter needs a mob");

    const saved = this.wounds.get(index);
    const fighter = saved ? { ...mob.fighter, hp: saved.hp, mp: saved.mp } : { ...mob.fighter };
    // The whole boss fight refuses a flee, including the mobs standing in front.
    if (pack.miniboss) fighter.miniboss = true;
    return fighter;
  }

  /** The mob's points. */
  private enemyView(): CombatantView {
    const enemy = this.fight?.fighters().enemy;
    if (!enemy) throw new Error("There is no fight");
    return { id: enemy.id, hp: enemy.hp, maxHp: enemy.maxHp, mp: enemy.mp, maxMp: enemy.maxMp };
  }

  /** The hero's carried stats, with the defaults a fresh hero leaves blank. */
  private toHero(hero: {
    id: string;
    hp: number;
    maxHp?: number;
    mp?: number;
    maxMp?: number;
    str: number;
    def: number;
    mag?: number;
    haste: number;
    potions?: number;
    level?: number;
    xp?: number;
  }): HeroState {
    const mp = hero.mp ?? 0;
    return {
      id: hero.id,
      hp: hero.hp,
      maxHp: hero.maxHp ?? hero.hp,
      mp,
      maxMp: hero.maxMp ?? mp,
      str: hero.str,
      def: hero.def,
      mag: hero.mag ?? 0,
      haste: hero.haste,
      potions: hero.potions ?? 0,
      level: hero.level ?? 1,
      xp: hero.xp ?? 0,
    };
  }

  /** True when this combat command is one the hero may take. */
  private isLegal(action: Action): boolean {
    return this.legalActions().some((legal) => this.matches(legal, action));
  }

  /** True when the two commands are the same choice. */
  private matches(legal: Action, action: Action): boolean {
    if (legal.type !== action.type) return false;
    switch (legal.type) {
      case "fight":
        return action.type === "fight" && legal.target === action.target;
      case "cast":
        return (
          action.type === "cast" && legal.spell === action.spell && legal.target === action.target
        );
      case "item":
        return action.type === "item" && legal.item === action.item;
      case "move":
        return false;
      case "defend":
      case "run":
        return true;
    }
  }

  /** The combat command as the fight plays it. */
  private toScripted(action: Action): ScriptedAction {
    switch (action.type) {
      case "fight":
        return "fight";
      case "defend":
        return "defend";
      case "run":
        return "flee";
      case "item":
        return "potion";
      case "cast": {
        const spell = this.spells.find((entry) => entry.id === action.spell);
        if (!spell) throw new Error(`Unknown spell "${action.spell}"`);
        return {
          type: "spell",
          spellId: spell.id,
          element: spell.element,
          power: spell.power,
          cost: spell.cost,
        };
      }
      case "move":
        throw new Error("That action is not available");
    }
  }

  /** True when this stick axis is a whole number from −64 to 64. */
  private axis(value: number): boolean {
    return Number.isInteger(value) && value >= -stickLimit && value <= stickLimit;
  }
}

/**
 * One seeded run of a bundle.
 *
 * @param options The bundle, the seed, and the rolls.
 */
export function createSim(options: CreateSimOptions): GameSimController {
  return new GameSimController(options);
}
