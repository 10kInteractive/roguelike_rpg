import { OneOnOneFightController } from "../combat/fight.controller";
import type { FightEvent, Fighter } from "../combat/fight.types";
import { CombatActionPolicy } from "../combat/policy.controller";
import { EncounterWalkController } from "../field/encounters.controller";
import type { EncounterEvent } from "../field/encounters.types";
import { tilesPerSecond } from "../field/movement";
import { FieldWalkPolicy } from "../field/policy.controller";
import { SeededRandomGenerator } from "../utils/rng.controller";
import type { Rng } from "../utils/rng.types";
import {
  enemyActionSeconds,
  fightTransitionSeconds,
  heroDecisionSeconds,
  maxStickHolds,
} from "./run.constants";
import type { FieldRunResult, GrinderRunInput, HeroState } from "./run.types";

/**
 * Plays one grinder run on a meadow.
 *
 * The grinder wanders until level 5, then walks to the miniboss. Each pack is
 * fought one mob at a time. The run ends when the miniboss falls or the hero does.
 */
export class GrinderFieldRunController {
  /** The meadow, mobs, hero, and bundle numbers for this run. */
  private readonly input: GrinderRunInput;

  /** The hero carried from one fight to the next. */
  private readonly hero: HeroState;

  /** Encounter rates, pack picks, counts, and potion drops. */
  private readonly fieldRng: Rng;

  /** Wander directions and enemy action picks. */
  private readonly choiceRng: Rng;

  /** Damage, crits, and flee rolls. */
  private readonly combatRng: Rng;

  /** Where the hero walks, and when a fight starts. */
  private readonly encounter: EncounterWalkController;

  /** Which way the grinder pushes the stick. */
  private readonly walkPolicy: FieldWalkPolicy;

  /** The fighter's turn choices: Fight, or a potion below 30% HP. */
  private readonly combatPolicy: CombatActionPolicy;

  /** Tiles the hero actually walked. */
  private distance = 0;

  /** Fights started, including a flee and the miniboss. */
  private fights = 0;

  /** Turns the hero took, for the play-time estimate. */
  private heroActions = 0;

  /** Turns the enemies took, for the play-time estimate. */
  private enemyActions = 0;

  /** Potions the hero drank. */
  private potionsUsed = 0;

  /** Level when the miniboss fight started. */
  private bossLevel: number | undefined;

  /**
   * @param input The meadow, mobs, hero, and bundle numbers for this run.
   */
  constructor(input: GrinderRunInput) {
    this.input = input;
    this.hero = this.copyHero(input.hero);
    this.fieldRng = input.rngs?.field ?? new SeededRandomGenerator(input.seed);
    this.choiceRng = input.rngs?.choice ?? new SeededRandomGenerator(input.seed);
    this.combatRng = input.rngs?.combat ?? new SeededRandomGenerator(input.seed);
    this.encounter = new EncounterWalkController({
      position: { x: input.map.spawn.x + 0.5, y: input.map.spawn.y + 0.5 },
      field: input.map,
      tables: input.tables,
      minDistance: input.minDistance,
      rng: this.fieldRng,
      miniboss: input.miniboss,
    });
    this.walkPolicy = new FieldWalkPolicy({
      field: input.map,
      miniboss: input.miniboss.tile,
      rng: this.choiceRng,
    });
    this.combatPolicy = new CombatActionPolicy([], this.choiceRng);
  }

  /** Walks and fights until the miniboss falls, the hero falls, or the safety cap runs out. */
  play(): FieldRunResult {
    for (let hold = 0; hold < maxStickHolds && this.hero.hp > 0; hold++) {
      // Hold the grinder's stick, and stop early when a fight starts.
      const choice = this.walkPolicy.chooseGrinder(this.encounter.position, this.hero.level);
      const stepped = this.encounter.holdStick(choice.stick, choice.ticks);
      this.distance += stepped.distance;
      const started = stepped.events[0];
      if (!started) continue;

      if (started.miniboss) this.bossLevel = this.hero.level;

      const result = this.fightPack(started);
      if (result) return result;
    }

    return this.toFieldResult("lose");
  }

  /** One mob at a time. A flee or a defeat ends the pack. Returns a result when the run is over. */
  private fightPack(started: EncounterEvent): FieldRunResult | undefined {
    for (const group of started.groups) {
      for (let count = 0; count < group.count; count++) {
        const mob = this.input.mobs.get(group.id);
        if (!mob) throw new Error(`Unknown mob "${group.id}"`);
        const events = new OneOnOneFightController({
          hero: { ...this.hero, hero: true },
          enemy: mob.fighter,
          rng: this.combatRng,
          choiceRng: this.choiceRng,
          ...this.input.combat,
          leveling: this.input.leveling,
          heroPolicy: (hero) => this.combatPolicy.chooseFighter(hero),
        }).resolve();
        this.fights += 1;
        this.countActions(events);
        const outcome = this.outcomeOf(events);
        this.applyFight(events);

        if (outcome === "lose") return this.toFieldResult("lose", group.id);
        if (outcome === "flee") return undefined;
        if (mob.potionDrop !== undefined && this.fieldRng.next() < mob.potionDrop) {
          this.hero.potions += 1;
        }
        if (started.miniboss) return this.toFieldResult("win");
      }
    }
    return undefined;
  }

  /** The sweep's row for this run, including the estimated play time. */
  private toFieldResult(outcome: "win" | "lose", killedBy?: string): FieldRunResult {
    const playSeconds =
      this.heroActions * heroDecisionSeconds +
      this.enemyActions * enemyActionSeconds +
      this.fights * fightTransitionSeconds +
      this.distance / tilesPerSecond;
    return {
      outcome,
      bossLevel: this.bossLevel,
      fights: this.fights,
      distance: this.distance,
      playSeconds,
      potionsUsed: this.potionsUsed,
      killedBy,
    };
  }

  /** The hero at the start of the run, with the defaults filled in. */
  private copyHero(hero: Fighter): HeroState {
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

  /** Writes the fight's last HP, MP, potions, and level back onto the hero. */
  private applyFight(events: readonly FightEvent[]): void {
    const hero = this.hero;
    for (const event of events) {
      if (event.type === "damaged" && event.targetId === hero.id) hero.hp = event.targetHp;
      if (event.type === "itemUsed" && event.actorId === hero.id) {
        hero.hp = event.hp;
        hero.potions = event.remaining;
      }
      if (event.type === "spellCast" && event.actorId === hero.id) hero.mp = event.mp;
      if (event.type === "xpGained") {
        hero.xp = event.xp;
        hero.level = event.level;
      }
      if (event.type === "levelUp") {
        hero.xp -= this.input.leveling.xpPerLevel * (event.level - 1);
        hero.level = event.level;
        hero.hp = event.hp;
        hero.maxHp = event.maxHp;
        hero.mp = event.mp;
        hero.maxMp = event.maxMp;
        hero.str = event.str;
        hero.def = event.def;
        hero.mag = event.mag;
        hero.haste = event.haste;
      }
    }
  }

  /** Adds this fight's hero decisions, enemy actions, and potions drunk to the run. */
  private countActions(events: readonly FightEvent[]): void {
    const heroId = this.hero.id;
    for (const event of events) {
      if (event.type === "itemUsed" && event.actorId === heroId) this.potionsUsed += 1;
      if (!("actorId" in event)) continue;
      if (
        event.type !== "attacked" &&
        event.type !== "defended" &&
        event.type !== "itemUsed" &&
        event.type !== "spellCast" &&
        event.type !== "fleeAttempted" &&
        event.type !== "grind"
      ) {
        continue;
      }
      if (event.actorId === heroId) this.heroActions += 1;
      else this.enemyActions += 1;
    }
  }

  /** Win when an enemy falls, flee when the hero escapes, lose when the hero falls. */
  private outcomeOf(events: readonly FightEvent[]): "win" | "lose" | "flee" {
    for (const event of events) {
      if (event.type === "fleeAttempted" && event.success) return "flee";
      if (event.type === "actorDefeated") return event.actorId === this.hero.id ? "lose" : "win";
    }
    return "lose";
  }
}
