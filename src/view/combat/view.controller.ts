import type { Texture } from "three";
import { debugLog } from "../../debug/logger.controller";
import { debugWatches } from "../../debug/watch.controller";
import type { Fighter } from "../../sim/combat/fight.types";
import { CombatActionPolicy } from "../../sim/combat/policy.controller";
import type { KnownSpell } from "../../sim/combat/policy.types";
import type { LevelRules } from "../../sim/combat/utils/level.types";
import type { Terrain } from "../../sim/field/map.types";
import { PackFightController } from "../../sim/run/pack.controller";
import type { PackOutcome } from "../../sim/run/pack.types";
import type { CombatRules, RunMob } from "../../sim/run/run.types";
import { SeededRandomGenerator } from "../../sim/utils/rng.controller";
import type { RenderLoopController } from "../renderer.controller";
import { FloatingTextController } from "./floating-text.controller";
import { combatCamera } from "./scene.constants";
import { CombatSceneController } from "./scene.controller";
import { CombatSequencerController } from "./sequencer.controller";
import { TweenController } from "./tween.controller";
import { betweenFightsSeconds, standInThinkSeconds } from "./view.constants";

const log = debugLog.create("view:combat");

/**
 * A pack fight on screen, from a fixed camera.
 *
 * The sim resolves the whole pack up front, one mob at a time. The sequencer
 * then plays each fight's events in order, and the next mob steps out when
 * the last one falls. Until the command menu exists, a caster policy stands
 * in for the player.
 */
export class CombatViewController {
  /** The fight's Three.js objects. */
  private readonly combat: CombatSceneController;

  /** Draws the scene each frame. */
  private readonly loop: RenderLoopController;

  /** Timed beats, advanced each frame. */
  private readonly tweens = new TweenController();

  /** Plays each fight's events. */
  private readonly sequencer: CombatSequencerController;

  /** Resolves the pack in the sim. */
  private readonly packs: PackFightController;

  /** The pack in the order it is fought. */
  private readonly mobIds: readonly string[];

  /** True when the pack is the miniboss, which cannot be fled. */
  private readonly miniboss: boolean;

  /** How the pack ended, once it has played out. */
  private outcome: PackOutcome | "playing" = "playing";

  constructor(input: {
    /** Draws the scene each frame. */
    loop: RenderLoopController;
    /** The pack in the order it is fought. */
    mobIds: readonly string[];
    /** Terrain textures for the backdrop. */
    textures: Partial<Record<Terrain, Texture>>;
    /** The hero before the fight. */
    hero: Fighter;
    /** Every mob the pack can name. */
    mobs: ReadonlyMap<string, RunMob>;
    /** Damage, flee, and potion numbers. */
    combat: CombatRules;
    /** XP thresholds and growth. */
    leveling: LevelRules;
    /** The hero's spells, for the stand-in caster. */
    spells: readonly KnownSpell[];
    /** Seed for the fight's rolls. */
    seed: number;
  }) {
    this.loop = input.loop;
    this.mobIds = input.mobIds;
    this.miniboss = input.mobIds.some((id) => input.mobs.get(id)?.fighter.miniboss);
    this.combat = new CombatSceneController(input.mobIds, input.textures);

    const choice = new SeededRandomGenerator(input.seed);
    const policy = new CombatActionPolicy([...input.spells], choice);
    this.packs = new PackFightController({
      hero: input.hero,
      mobs: input.mobs,
      combat: input.combat,
      leveling: input.leveling,
      heroPolicy: (hero, target) => policy.chooseCaster(hero, target),
      rngs: {
        drops: new SeededRandomGenerator(input.seed),
        choice,
        combat: new SeededRandomGenerator(input.seed),
      },
    });
    this.sequencer = new CombatSequencerController({
      combat: this.combat,
      tweens: this.tweens,
      text: new FloatingTextController(this.combat.scene, this.tweens),
      heroId: input.hero.id,
      beforeHeroTurn: () => this.tweens.wait(standInThinkSeconds),
    });
    this.aim();
    log(`pack: ${input.mobIds.join(", ")}, seed ${input.seed}`);

    if (import.meta.env.DEV) {
      debugWatches.watch("pack", () => input.mobIds.join(", "));
      debugWatches.watch("fighting", () => input.mobIds[this.combat.focusedIndex()] ?? "nobody");
      debugWatches.watch("beat", () => this.sequencer.playing());
      debugWatches.watch("tweens", () => this.tweens.count());
      debugWatches.watch("outcome", () => this.outcome);
    }
  }

  /** Starts drawing the fight every frame, then plays the pack. */
  async start(): Promise<void> {
    await this.loop.run(this.combat.scene, (elapsed) => {
      this.tweens.advance(elapsed);
      this.combat.animate(elapsed);
    });
    void this.playPack();
  }

  /** Resolves the pack in the sim, then plays each mob's fight in order. */
  private async playPack(): Promise<void> {
    const groups = this.mobIds.map((id) => ({ id, count: 1 }));
    const result = this.packs.fight(groups, this.miniboss);

    for (const [index, fight] of result.fights.entries()) {
      this.combat.focus(index);
      await this.tweens.wait(betweenFightsSeconds);
      await this.sequencer.play(fight.events);
    }
    this.outcome = result.outcome;
    log(`pack ${result.outcome} after ${result.fights.length} fights`, this.packs.hero());
  }

  /** The fixed combat camera, south of the stage and a little above it. */
  private aim(): void {
    const { position, lookAt } = combatCamera;
    this.loop.camera.position.set(position.x, position.y, position.z);
    this.loop.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
  }
}
