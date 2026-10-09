import type { Texture } from "three";
import type { Bundle } from "../content/schema";
import { debugLog } from "../debug/logger.controller";
import { debugWatches } from "../debug/watch.controller";
import { createSim } from "../sim";
import { CombatActionPolicy } from "../sim/combat/policy.controller";
import type { EncounterEvent } from "../sim/field/encounters.types";
import type { Terrain } from "../sim/field/map.types";
import type { GameSimController } from "../sim/game.controller";
import type { Action, SimEvent } from "../sim/game.types";
import { SeededRandomGenerator } from "../sim/utils/rng.controller";
import type { Rng } from "../sim/utils/rng.types";
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
 * The grinder's policies stand in for the player. Each choice goes through
 * the sim's `act`, one decision at a time, and the view plays what came
 * back. The run ends when the miniboss falls or the hero does.
 */
export class GameLoopController {
  /** Draws whichever scene is on. */
  private readonly loop: RenderLoopController;

  /** The run. Every move and combat command goes through it. */
  private readonly sim: GameSimController;

  /** The meadow, the hero walking it, and the camera over it. */
  private readonly field: FieldViewController;

  /** The grinder's combat commands. It spends no rolls. */
  private readonly combat: CombatActionPolicy;

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
    this.combat = new CombatActionPolicy([], choiceRng);

    const snapshot = this.sim.observe();
    this.field = new FieldViewController({
      loop: this.loop,
      map: snapshot.field.map,
      textures: this.textures,
      minibossId: snapshot.field.miniboss.id,
      seed: input.seed,
      walk: new StandInWalkController(this.sim, choiceRng),
      cameraMode: input.cameraMode,
    });

    if (import.meta.env.DEV) {
      debugWatches.watch("run", () => this.phase);
      debugWatches.watch("level", () => this.sim.observe().hero.level);
      debugWatches.watch("hp", () => {
        const hero = this.sim.observe().hero;
        return `${hero.hp}/${hero.maxHp}`;
      });
      debugWatches.watch("fights", () => this.fought());
    }
  }

  /** Walks and fights until the run ends. Resolves with how it ended. */
  async play(): Promise<RunEnd> {
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
  }

  /** Shows the opening, then lets the grinder answer each hero turn. */
  private async playFight(opening: readonly SimEvent[]): Promise<void> {
    const started = opening.find((event) => event.type === "encounterStarted");
    if (started?.type !== "encounterStarted")
      throw new Error("A fight started without an encounter");

    const view = new CombatViewController({
      loop: this.loop,
      mobIds: this.mobIdsOf(started),
      textures: this.textures,
      heroId: this.sim.observe().hero.id,
    });
    await view.show(opening);
    while (this.sim.observe().mode === "combat") {
      await view.show(this.sim.act(this.command()));
    }
  }

  /** The grinder's command for the open turn. A potion when badly hurt, otherwise Fight. */
  private command(): Action {
    const snapshot = this.sim.observe();
    const target = snapshot.combat?.mobId ?? "";
    return this.combat.chooseFighter(snapshot.hero) === "potion"
      ? { type: "item", item: "item.potion" }
      : { type: "fight", target };
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
