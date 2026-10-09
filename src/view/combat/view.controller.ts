import type { Texture } from "three";
import { debugLog } from "../../debug/logger.controller";
import { debugWatches } from "../../debug/watch.controller";
import type { Terrain } from "../../sim/field/map.types";
import type { PackOutcome, PackResult } from "../../sim/run/pack.types";
import type { RenderLoopController } from "../renderer.controller";
import { FloatingTextController } from "./floating-text.controller";
import { combatCamera } from "./scene.constants";
import { CombatSceneController } from "./scene.controller";
import { CombatSequencerController } from "./sequencer.controller";
import { TweenController } from "./tween.controller";
import { afterPackSeconds, betweenFightsSeconds, standInThinkSeconds } from "./view.constants";

const log = debugLog.create("view:combat");

/**
 * A pack fight on screen, from a fixed camera.
 *
 * The sim has already resolved the whole pack, one mob at a time. The
 * sequencer plays each fight's events in order, and the next mob steps out
 * when the last one falls. Until the command menu exists, a short pause
 * stands in for the player choosing.
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

  /** How the pack ended, once it has played out. */
  private outcome: PackOutcome | "playing" = "playing";

  constructor(input: {
    /** Draws the scene each frame. */
    loop: RenderLoopController;
    /** The pack in the order it is fought, one id per mob. */
    mobIds: readonly string[];
    /** Terrain textures for the backdrop. */
    textures: Partial<Record<Terrain, Texture>>;
    /** Id the hero's events carry. */
    heroId: string;
  }) {
    this.loop = input.loop;
    this.combat = new CombatSceneController(input.mobIds, input.textures);
    this.sequencer = new CombatSequencerController({
      combat: this.combat,
      tweens: this.tweens,
      text: new FloatingTextController(this.combat.scene, this.tweens),
      heroId: input.heroId,
      beforeHeroTurn: () => this.tweens.wait(standInThinkSeconds),
    });
    log(`pack: ${input.mobIds.join(", ")}`);

    if (import.meta.env.DEV) {
      debugWatches.watch("pack", () => input.mobIds.join(", "));
      debugWatches.watch("fighting", () => input.mobIds[this.combat.focusedIndex()] ?? "nobody");
      debugWatches.watch("beat", () => this.sequencer.playing());
      debugWatches.watch("tweens", () => this.tweens.count());
      debugWatches.watch("outcome", () => this.outcome);
    }
  }

  /**
   * Draws the fight every frame and plays each mob's fight in order.
   * Resolves a moment after the last beat, so the ending stays on screen.
   *
   * @param result The pack as the sim resolved it.
   */
  async play(result: PackResult): Promise<void> {
    this.aim();
    void this.loop.run(this.combat.scene, (elapsed) => {
      this.tweens.advance(elapsed);
      this.combat.animate(elapsed);
    });

    for (const [index, fight] of result.fights.entries()) {
      this.combat.focus(index);
      await this.tweens.wait(betweenFightsSeconds);
      await this.sequencer.play(fight.events);
    }
    this.outcome = result.outcome;
    log(`pack ${result.outcome} after ${result.fights.length} fights`);
    await this.tweens.wait(afterPackSeconds);
  }

  /** The fixed combat camera, south of the stage and a little above it. */
  private aim(): void {
    const { position, lookAt } = combatCamera;
    this.loop.camera.position.set(position.x, position.y, position.z);
    this.loop.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
  }
}
