import type { Texture } from "three";
import { heroFighterFromBundle } from "../content/fighters";
import {
  combatRulesFromBundle,
  encounterTablesFromBundle,
  levelRulesFromBundle,
  runMobsFromBundle,
} from "../content/rules";
import type { Bundle } from "../content/schema";
import { debugLog } from "../debug/logger.controller";
import { debugWatches } from "../debug/watch.controller";
import { CombatActionPolicy } from "../sim/combat/policy.controller";
import type { EncounterEvent } from "../sim/field/encounters.types";
import type { MeadowMap, Terrain } from "../sim/field/map.types";
import { PackFightController } from "../sim/run/pack.controller";
import { SeededRandomGenerator } from "../sim/utils/rng.controller";
import { CombatViewController } from "../view/combat/view.controller";
import { StandInWalkController } from "../view/field/stand-in-walk.controller";
import { FieldViewController } from "../view/field/view.controller";
import type { FieldCameraMode } from "../view/field/view.types";
import type { RenderLoopController } from "../view/renderer.controller";
import type { GameLoopPhase, RunEnd } from "./game-loop.types";

const log = debugLog.create("runtime:loop");

/**
 * One run that plays itself: walk the field, fight what the walk runs into,
 * then walk on from where the hero stood.
 *
 * The grinder's policies stand in for the player, and the run's three
 * generators are seeded the way the headless grinder seeds them, so a seed
 * plays the same run here as in the sweep. The run ends when the miniboss
 * falls or the hero does.
 */
export class GameLoopController {
  /** Draws whichever scene is on. */
  private readonly loop: RenderLoopController;

  /** The meadow, the hero walking it, and the camera over it. */
  private readonly field: FieldViewController;

  /** Fights each pack and carries the hero from one fight to the next. */
  private readonly packs: PackFightController;

  /** Terrain textures, shared by the field and every fight's backdrop. */
  private readonly textures: Partial<Record<Terrain, Texture>>;

  /** What the run is doing now, for the dev panel. */
  private phase: GameLoopPhase = "walking";

  /** Mobs fought so far, counting each mob in a pack. */
  private fights = 0;

  constructor(input: {
    /** Draws whichever scene is on. */
    loop: RenderLoopController;
    /** The content the run plays. */
    bundle: Bundle;
    /** The biome the meadow was made from. */
    biome: Bundle["biomes"][number];
    /** The seeded meadow. */
    map: MeadowMap;
    /** Terrain textures that loaded. */
    textures: Partial<Record<Terrain, Texture>>;
    /** Seed for the run's field, choice, and combat rolls. */
    seed: number;
    /** Follow the hero, or show the whole meadow. */
    cameraMode: FieldCameraMode;
  }) {
    const { bundle, biome, map, seed } = input;
    this.loop = input.loop;
    this.textures = input.textures;

    // Encounter rolls and potion drops share one generator, and wander and
    // action picks share another, the same as the headless grinder run.
    const fieldRng = new SeededRandomGenerator(seed);
    const choiceRng = new SeededRandomGenerator(seed);
    const policy = new CombatActionPolicy([], choiceRng);
    this.packs = new PackFightController({
      hero: heroFighterFromBundle(bundle.hero),
      mobs: runMobsFromBundle(bundle),
      combat: combatRulesFromBundle(bundle),
      leveling: levelRulesFromBundle(bundle),
      heroPolicy: (hero) => policy.chooseFighter(hero),
      rngs: { drops: fieldRng, choice: choiceRng, combat: new SeededRandomGenerator(seed) },
    });

    const miniboss = { tile: map.miniboss, radius: biome.minibossRadius, id: biome.miniboss };
    this.field = new FieldViewController({
      loop: this.loop,
      map,
      textures: this.textures,
      minibossId: biome.miniboss,
      seed,
      walk: new StandInWalkController({
        map,
        tables: encounterTablesFromBundle(bundle),
        minDistance: bundle.rules.minEncounterDistance,
        miniboss,
        fieldRng,
        choiceRng,
      }),
      cameraMode: input.cameraMode,
    });

    if (import.meta.env.DEV) {
      debugWatches.watch("run", () => this.phase);
      debugWatches.watch("level", () => this.packs.hero().level);
      debugWatches.watch("hp", () => `${this.packs.hero().hp}/${this.packs.hero().maxHp}`);
      debugWatches.watch("fights", () => this.fights);
    }
  }

  /** Walks and fights until the run ends. Resolves with how it ended. */
  async play(): Promise<RunEnd> {
    for (;;) {
      this.phase = "walking";
      const started = await this.field.walkUntilFight(this.packs.hero().level);

      this.phase = "fighting";
      const level = this.packs.hero().level;
      const result = this.packs.fight(started.groups, started.miniboss);
      this.fights += result.fights.length;
      await new CombatViewController({
        loop: this.loop,
        mobIds: this.mobIdsOf(started),
        textures: this.textures,
        heroId: this.packs.hero().id,
      }).play(result);

      const hero = this.packs.hero();
      log(`pack ${result.outcome}, level ${hero.level}, hp ${hero.hp}/${hero.maxHp}`);
      if (result.outcome === "lose") {
        this.phase = "lost";
        const killedBy = result.fights.at(-1)?.mobId;
        return { outcome: "lose", level, fights: this.fights, killedBy };
      }
      if (result.outcome === "win" && started.miniboss) {
        this.phase = "won";
        return { outcome: "win", level: hero.level, fights: this.fights };
      }
    }
  }

  /** One id per mob, in the order the pack is fought. */
  private mobIdsOf(started: EncounterEvent): string[] {
    return started.groups.flatMap((group) => Array.from({ length: group.count }, () => group.id));
  }
}
