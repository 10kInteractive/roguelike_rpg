import type { Texture } from "three";
import type { Bundle } from "../content/schema";
import { debugLog } from "../debug/logger.controller";
import { debugWatches } from "../debug/watch.controller";
import { KeyboardController } from "../input/keyboard.controller";
import { createSim } from "../sim";
import { CombatActionPolicy } from "../sim/combat/policy.controller";
import type { EncounterEvent } from "../sim/field/encounters.types";
import type { Terrain } from "../sim/field/map.types";
import type { GameSimController } from "../sim/game.controller";
import type { Action, SimEvent } from "../sim/game.types";
import { SeededRandomGenerator } from "../sim/utils/rng.controller";
import type { Rng } from "../sim/utils/rng.types";
import { uiStore } from "../ui/store.controller";
import { CombatViewController } from "../view/combat/view.controller";
import { PlayerWalkController } from "../view/field/player-walk.controller";
import { StandInWalkController } from "../view/field/stand-in-walk.controller";
import { FieldViewController } from "../view/field/view.controller";
import type { FieldCameraMode } from "../view/field/view.types";
import type { RenderLoopController } from "../view/renderer.controller";
import type { GameLoopMode, GameLoopPhase, RunEnd } from "./game-loop.types";

const log = debugLog.create("runtime:loop");

/**
 * One run: walk the field, fight what the walk runs into, then walk on.
 *
 * The player walks with the keys and picks each combat command, unless the
 * page asked for `ai`, in which case the grinder's policies stand in. Each
 * choice goes through the sim's `act`, and the view plays what came back.
 */
export class GameLoopController {
  /** Draws whichever scene is on. */
  private readonly loop: RenderLoopController;

  /** The run. Every move and combat command goes through it. */
  private readonly sim: GameSimController;

  /** The meadow, the hero walking it, and the camera over it. */
  private readonly field: FieldViewController;

  /** The grinder's combat commands. Null when the player is choosing. */
  private readonly combat: CombatActionPolicy | null;

  /** Keys for the player's walk. Null when the stand-in is walking. */
  private readonly keys: KeyboardController | null;

  /** Terrain textures, shared by the field and every fight's backdrop. */
  private readonly textures: Partial<Record<Terrain, Texture>>;

  /** What the run is doing now, for the dev panel. */
  private phase: GameLoopPhase = "walking";

  constructor(input: {
    /** Draws whichever scene is on. */
    loop: RenderLoopController;
    /** The content the run plays. */
    bundle: Bundle;
    /** Terrain textures that loaded. */
    textures: Partial<Record<Terrain, Texture>>;
    /** Seed for the meadow and the run's three rolls. */
    seed: number;
    /** Follow the hero, or show the whole meadow. */
    cameraMode: FieldCameraMode;
    /** The player, or the stand-in. */
    gameloop: GameLoopMode;
  }) {
    this.loop = input.loop;
    this.textures = input.textures;

    // Wander and enemy picks share one generator, the same as the headless grinder.
    const choiceRng: Rng = new SeededRandomGenerator(input.seed);
    this.sim = createSim({
      bundle: input.bundle,
      seed: input.seed,
      rngs: {
        field: new SeededRandomGenerator(input.seed),
        choice: choiceRng,
        combat: new SeededRandomGenerator(input.seed),
      },
    });
    this.combat = input.gameloop === "ai" ? new CombatActionPolicy([], choiceRng) : null;
    this.keys = input.gameloop === "ai" ? null : new KeyboardController();

    const snapshot = this.sim.observe();
    this.field = new FieldViewController({
      loop: this.loop,
      map: snapshot.field.map,
      textures: this.textures,
      minibossId: snapshot.field.miniboss.id,
      seed: input.seed,
      walk: this.keys
        ? new PlayerWalkController(this.sim, this.keys)
        : new StandInWalkController(this.sim, choiceRng),
      cameraMode: input.cameraMode,
    });

    if (import.meta.env.DEV) {
      debugWatches.watch("run", () => this.phase);
      debugWatches.watch("level", () => this.sim.observe().hero.level);
      debugWatches.watch("hp", () => {
        const hero = uiStore.snapshot()?.hero;
        return hero ? `${hero.hp}/${hero.maxHp}` : "";
      });
      debugWatches.watch("fights", () => this.fought());
      debugWatches.watch("queue", () => uiStore.pending().length);
    }
  }

  /** Walks and fights until the run ends. Resolves with how it ended. */
  async play(): Promise<RunEnd> {
    try {
      uiStore.present(this.sim.observe());
      for (;;) {
        this.phase = "walking";
        const started = await this.field.walkUntilFight();

        this.phase = "fighting";
        await this.playFight(started);
        const end = this.sim.observe();
        const hero = end.hero;
        log(`${end.mode}, level ${hero.level}, hp ${hero.hp}/${hero.maxHp}`);
        if (end.mode === "victory" || end.mode === "gameOver") {
          this.phase = end.mode === "victory" ? "won" : "lost";
          return this.toRunEnd();
        }
      }
    } finally {
      this.keys?.stop();
    }
  }

  /** Shows the opening, then takes a command for each hero turn. */
  private async playFight(opening: readonly SimEvent[]): Promise<void> {
    const started = opening.find((event) => event.type === "encounterStarted");
    if (started?.type !== "encounterStarted")
      throw new Error("A fight started without an encounter");

    const view = new CombatViewController({
      loop: this.loop,
      mobIds: this.mobIdsOf(started),
      textures: this.textures,
      heroId: this.sim.observe().hero.id,
      onPlayed: () => uiStore.played(),
    });
    this.hand(opening);
    await view.show(opening);
    uiStore.present(this.sim.observe());
    while (this.sim.observe().mode === "combat") {
      const events = this.sim.act(await this.command());
      this.hand(events);
      await view.show(events);
      uiStore.present(this.sim.observe());
    }
  }

  /** Queues the action's events. The bar catches up as each one plays. */
  private hand(events: readonly SimEvent[]): void {
    uiStore.enqueue(events);
  }

  /** The next combat command: the window's choice, or the grinder's. */
  private command(): Promise<Action> {
    const policy = this.combat;
    if (!policy) return uiStore.requestCommand(this.sim.legalActions());

    const snapshot = this.sim.observe();
    const target = snapshot.combat?.mobId ?? "";
    const choice = policy.chooseFighter(snapshot.hero);
    return Promise.resolve(
      choice === "potion" ? { type: "item", item: "item.potion" } : { type: "fight", target },
    );
  }

  /** How the run ended, from the sim's scoreboard. */
  private toRunEnd(): RunEnd {
    const snapshot = this.sim.observe();
    const lost = snapshot.mode === "gameOver";
    return {
      outcome: lost ? "lose" : "win",
      level: snapshot.hero.level,
      fights: this.fought(),
      killedBy: snapshot.stats.killedBy,
    };
  }

  /** Mobs fought, counting a defeat. The scoreboard counts wins and flees on its own. */
  private fought(): number {
    const stats = this.sim.observe().stats;
    return stats.fightsWon + stats.fightsFled + (stats.killedBy === undefined ? 0 : 1);
  }

  /** One id per mob, in the order the pack is fought. */
  private mobIdsOf(started: EncounterEvent): string[] {
    return started.groups.flatMap((group) => Array.from({ length: group.count }, () => group.id));
  }
}
