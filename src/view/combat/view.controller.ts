import { debugLog } from "../../debug/logger.controller";
import { debugWatches } from "../../debug/watch.controller";
import { gamepad } from "../../input/gamepad.controller";
import type { FightEvent } from "../../sim/combat/fight.types";
import type { SimEvent } from "../../sim/game.types";
import type { PackOutcome, PackResult } from "../../sim/run/pack.types";
import { pause } from "../../ui/components/pause/controller";
import { veil } from "../../ui/components/veil/controller";
import type { RenderLoopController } from "../renderer.controller";
import type { BackdropTextures, FightTerrain } from "./backdrops/backdrop.types";
import { FloatingTextController } from "./floating-text.controller";
import { combatCamera } from "./scene.constants";
import { CombatSceneController } from "./scene.controller";
import { MobSelectController } from "./select.controller";
import { CombatSequencerController } from "./sequencer.controller";
import { TweenController } from "./tween.controller";
import { afterPackSeconds, betweenFightsSeconds, standInThinkSeconds } from "./view.constants";

const log = debugLog.create("view:combat");

/**
 * A pack fight on screen. The camera looks at the center and drifts a little on its own.
 *
 * `show` plays one sim action: the hero's command, the enemy's turns, and
 * the ring moving to the next mob when this one falls. `choose` waits for the
 * player to lock a living mob before the command window opens. The pack stays
 * where it was placed. `play` plays a pack the sim already resolved, for the
 * `?combat` launcher.
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

  /** The pack in encounter order, one id per mob. */
  private readonly mobIds: readonly string[];

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
    this.mobIds = input.mobIds;
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
      debugWatches.watch("pack", () => this.mobIds.join(", "));
      debugWatches.watch("fighting", () => this.mobIds[this.combat.focusedIndex()] ?? "nobody");
      debugWatches.watch("beat", () => this.sequencer.playing());
      debugWatches.watch("tweens", () => this.tweens.count());
      debugWatches.watch("outcome", () => this.outcome);
      debugWatches.watch("camera sway", () => this.combat.sway().toFixed(2));
    }
  }

  /**
   * Plays one action's events. A fallen mob leaves the others where they stand,
   * and the ring moves to the next one before its events play.
   * The stage stays up, so the next action continues on it.
   *
   * @param events What `act` returned, through the next decision or the end of the pack.
   */
  async show(events: readonly SimEvent[]): Promise<void> {
    if (!this.shown) {
      this.shown = true;
      this.aim();
      void this.loop.run(this.combat.scene, (elapsed) => this.frame(elapsed));
      await veil.reveal();
      await this.tweens.wait(betweenFightsSeconds);
    }

    for (const event of events) {
      if (this.isBeat(event)) await this.sequencer.play([event]);
      this.onPlayed();

      // The ring moves to the next mob. The pack stays in its places.
      if (event.type !== "combatEnded") continue;
      this.outcome = event.outcome;
      if (event.outcome !== "win") {
        this.combat.ringAt(null);
        continue;
      }
      const next = this.combat.standing()[0];
      if (next === undefined) {
        this.combat.ringAt(null);
        continue;
      }
      this.combat.ringAt(next);
      log("ring", this.mobIds[next] ?? "nobody");
      await this.tweens.wait(betweenFightsSeconds);
    }

    // The pack is over when no next turn is waiting.
    const over =
      events.some((event) => event.type === "victory" || event.type === "gameOver") ||
      (events.some((event) => event.type === "combatEnded") &&
        !events.some((event) => event.type === "turnStarted"));
    if (over) await this.tweens.wait(afterPackSeconds);
  }

  /**
   * Waits until the player locks a living mob.
   * Up and down, and the pad's d-pad or stick, move the ring. A or Enter confirms it.
   * The pack does not move.
   *
   * @param line Encounter indices still standing, front of the line first.
   * @param focused The mob in focus last time.
   */
  choose(line: readonly number[], focused: number): Promise<number> {
    const select = new MobSelectController(line, focused);
    this.mark(select.chosen());
    log("choosing", this.mobIds[select.chosen()] ?? "nobody");

    return new Promise((resolve) => {
      let settled = false;
      const finish = (index: number) => {
        if (settled) return;
        settled = true;
        stop();
        this.mark(index);
        log("lock", this.mobIds[index] ?? "nobody");
        resolve(index);
      };
      const onKey = (event: KeyboardEvent) => {
        if (event.repeat || pause.isOpen() || settled) return;
        const direction = this.direction(event.code);
        if (!direction) return;
        event.preventDefault();
        if (direction === "up") this.step(select, -1);
        if (direction === "down") this.step(select, 1);
        if (direction === "confirm") finish(select.chosen());
      };
      const stopPad = gamepad.onMenu((action) => {
        if (pause.isOpen() || settled) return;
        if (action === "up") this.step(select, -1);
        if (action === "down") this.step(select, 1);
        if (action === "confirm") finish(select.chosen());
      });
      window.addEventListener("keydown", onKey);
      const stop = () => {
        window.removeEventListener("keydown", onKey);
        stopPad();
      };
    });
  }

  /** Moves the ring along the line and logs who it sits under. The pack stays put. */
  private step(select: MobSelectController, delta: number): void {
    const index = select.move(delta);
    this.mark(index);
    log("focus", this.mobIds[index] ?? "nobody");
  }

  /** Puts the ring under that mob without moving the pack. */
  private mark(index: number): void {
    this.combat.ringAt(index);
  }

  /** Up, down, or confirm. Anything else is ignored while a mob is being chosen. */
  private direction(code: string): "up" | "down" | "confirm" | null {
    if (code === "ArrowUp" || code === "KeyW") return "up";
    if (code === "ArrowDown" || code === "KeyS") return "down";
    if (
      code === "Enter" ||
      code === "KeyA" ||
      code === "Space" ||
      code === "KeyZ" ||
      code === "ArrowRight" ||
      code === "KeyD"
    ) {
      return "confirm";
    }
    return null;
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
    void this.loop.run(this.combat.scene, (elapsed) => this.frame(elapsed));

    this.combat.ringAt(null);
    for (const [index, fight] of result.fights.entries()) {
      this.combat.focus(index);
      await this.tweens.wait(betweenFightsSeconds);
      await this.sequencer.play(fight.events);
    }
    this.outcome = result.outcome;
    log(`pack ${result.outcome} after ${result.fights.length} fights`);
    await this.tweens.wait(afterPackSeconds);
  }

  /** One display frame: beats, the idle bob, then the camera on its sway. */
  private frame(elapsed: number): void {
    this.tweens.advance(elapsed);
    this.combat.animate(elapsed);
    this.aim();
  }

  /** The combat camera looks at the center of the field. Its x drifts on its own. */
  private aim(): void {
    const { position, lookAt } = combatCamera;
    this.loop.camera.position.set(position.x + this.combat.sway(), position.y, position.z);
    this.loop.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
  }
}
