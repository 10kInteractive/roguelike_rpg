import type { FightEvent } from "../combat/fight.types";
import { CombatActionPolicy } from "../combat/policy.controller";
import { EncounterWalkController } from "../field/encounters.controller";
import type { EncounterEvent } from "../field/encounters.types";
import { tilesPerSecond } from "../field/movement.constants";
import { FieldWalkPolicy } from "../field/policy.controller";
import { SeededRandomGenerator } from "../utils/rng.controller";
import type { Rng } from "../utils/rng.types";
import { PackFightController } from "./pack.controller";
import {
  enemyActionSeconds,
  fightTransitionSeconds,
  heroDecisionSeconds,
  maxStickHolds,
} from "./run.constants";
import type { FieldRunResult, GrinderRunInput } from "./run.types";

/**
 * Plays one grinder run on a meadow.
 *
 * The grinder wanders until level 5, then walks to the miniboss. Each pack is
 * fought one mob at a time. The run ends when the miniboss falls or the hero does.
 */
export class GrinderFieldRunController {
  /** Fights each pack and carries the hero from one fight to the next. */
  private readonly pack: PackFightController;

  /** Encounter rates, pack picks, counts, and potion drops. */
  private readonly fieldRng: Rng;

  /** Wander directions and enemy action picks. */
  private readonly choiceRng: Rng;

  /** Where the hero walks, and when a fight starts. */
  private readonly encounter: EncounterWalkController;

  /** Which way the grinder pushes the stick. */
  private readonly walkPolicy: FieldWalkPolicy;

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
    this.fieldRng = input.rngs?.field ?? new SeededRandomGenerator(input.seed);
    this.choiceRng = input.rngs?.choice ?? new SeededRandomGenerator(input.seed);
    const combatPolicy = new CombatActionPolicy([], this.choiceRng);
    this.pack = new PackFightController({
      hero: input.hero,
      mobs: input.mobs,
      combat: input.combat,
      leveling: input.leveling,
      heroPolicy: (hero) => combatPolicy.chooseFighter(hero),
      rngs: {
        drops: this.fieldRng,
        choice: this.choiceRng,
        combat: input.rngs?.combat ?? new SeededRandomGenerator(input.seed),
      },
    });
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
  }

  /** Walks and fights until the miniboss falls, the hero falls, or the safety cap runs out. */
  play(): FieldRunResult {
    for (let hold = 0; hold < maxStickHolds && this.pack.hero().hp > 0; hold++) {
      // Hold the grinder's stick, and stop early when a fight starts.
      const choice = this.walkPolicy.chooseGrinder(this.encounter.position, this.pack.hero().level);
      const stepped = this.encounter.holdStick(choice.stick, choice.ticks);
      this.distance += stepped.distance;
      const started = stepped.events[0];
      if (!started) continue;

      if (started.miniboss) this.bossLevel = this.pack.hero().level;

      const result = this.fightPack(started);
      if (result) return result;
    }

    return this.toFieldResult("lose");
  }

  /** Fights the pack and tallies it. Returns a result when the run is over. */
  private fightPack(started: EncounterEvent): FieldRunResult | undefined {
    const result = this.pack.fight(started.groups, started.miniboss);
    for (const fight of result.fights) {
      this.fights += 1;
      this.countActions(fight.events);
    }

    if (result.outcome === "lose") return this.toFieldResult("lose", result.fights.at(-1)?.mobId);
    if (result.outcome === "win" && started.miniboss) return this.toFieldResult("win");
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

  /** Adds this fight's hero decisions, enemy actions, and potions drunk to the run. */
  private countActions(events: readonly FightEvent[]): void {
    const heroId = this.pack.hero().id;
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
}
