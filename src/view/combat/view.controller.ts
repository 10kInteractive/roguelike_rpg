import { debugLog } from "../../debug/logger.controller";
import { debugWatches } from "../../debug/watch.controller";
import type { FightEvent } from "../../sim/combat/fight.types";
import type { SimEvent } from "../../sim/game.types";
import type { PackOutcome, PackResult } from "../../sim/run/pack.types";
import { veil } from "../../ui/components/veil/controller";
import type { RenderLoopController } from "../renderer.controller";
import type { BackdropTextures, FightTerrain } from "./backdrops/backdrop.types";
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
 * `show` plays one sim action: the hero's command, the enemy's turns, and
 * the next mob stepping out when this one falls. `play` plays a pack the
 * sim already resolved, for the `?combat` launcher. Until the command menu
 * exists, a short pause stands in for the player choosing.
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

  /** How many mobs are on the stage. */
  private readonly mobCount: number;

  /** Which mob is stepped forward. */
  private mobIndex = 0;

  /** True once the stage is on screen. Later actions keep the camera where it is. */
  private shown = false;

  /** Called after each event has been shown, so the UI queue can drop it. */
  private readonly onPlayed: () => void;

  constructor(input: {
    /** Draws the scene each frame. */
    loop: RenderLoopController;
    /** The pack in the order it is fought, one id per mob. */
    mobIds: readonly string[];
    /** Terrain textures for the backdrop. */
    textures: BackdropTextures;
    /** Where the fight started. Grass and path are the meadow. Forest is the woods. */
    terrain?: FightTerrain;
    /** Id the hero's events carry. */
    heroId: string;
    /** Called after each event has been shown. */
    onPlayed?: () => void;
  }) {
    this.loop = input.loop;
    this.mobCount = input.mobIds.length;
    this.onPlayed = input.onPlayed ?? (() => {});
    this.combat = new CombatSceneController(input.mobIds, input.textures, input.terrain ?? "grass");
    this.sequencer = new CombatSequencerController({
      combat: this.combat,
      tweens: this.tweens,
      text: new FloatingTextController(this.combat.scene, this.tweens),
      heroId: input.heroId,
      beforeHeroTurn: () => this.tweens.wait(standInThinkSeconds),
    });
    log(`${input.terrain ?? "grass"}: ${input.mobIds.join(", ")}`);

    if (import.meta.env.DEV) {
      debugWatches.watch("pack", () => input.mobIds.join(", "));
      debugWatches.watch("fighting", () => input.mobIds[this.combat.focusedIndex()] ?? "nobody");
      debugWatches.watch("beat", () => this.sequencer.playing());
      debugWatches.watch("tweens", () => this.tweens.count());
      debugWatches.watch("outcome", () => this.outcome);
    }
  }

  /**
   * Plays one action's events. A fallen mob steps the next one out before its events play.
   * The stage stays up, so the next action continues on it.
   *
   * @param events What `act` returned, through the next decision or the end of the pack.
   */
  async show(events: readonly SimEvent[]): Promise<void> {
    if (!this.shown) {
      this.shown = true;
      this.aim();
      void this.loop.run(this.combat.scene, (elapsed) => {
        this.tweens.advance(elapsed);
        this.combat.animate(elapsed);
      });
      await veil.reveal();
      await this.tweens.wait(betweenFightsSeconds);
    }

    for (const event of events) {
      if (this.isBeat(event)) await this.sequencer.play([event]);
      this.onPlayed();

      // The next mob steps out before its own opening plays.
      if (event.type !== "combatEnded") continue;
      this.outcome = event.outcome;
      if (event.outcome === "win" && this.mobIndex + 1 < this.mobCount) {
        this.mobIndex += 1;
        this.combat.focus(this.mobIndex);
        await this.tweens.wait(betweenFightsSeconds);
      }
    }

    // The pack is over when no next turn is waiting.
    const over =
      events.some((event) => event.type === "victory" || event.type === "gameOver") ||
      (events.some((event) => event.type === "combatEnded") &&
        !events.some((event) => event.type === "turnStarted"));
    if (over) await this.tweens.wait(afterPackSeconds);
  }

  /** True when the sequencer has a beat for this event. The rest are for the UI. */
  private isBeat(event: SimEvent): event is FightEvent {
    switch (event.type) {
      case "encounterStarted":
      case "turnStarted":
      case "itemDropped":
      case "combatEnded":
      case "victory":
      case "gameOver":
        return false;
      default:
        return true;
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
