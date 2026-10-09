import type { Texture } from "three";
import { debugLog } from "../../debug/logger.controller";
import { debugWatches } from "../../debug/watch.controller";
import type { MeadowMap, Terrain } from "../../sim/field/map.types";
import { tickRate } from "../../sim/field/movement.constants";
import type { Position } from "../../sim/field/movement.types";
import type { SimEvent } from "../../sim/game.types";
import type { RenderLoopController } from "../renderer.controller";
import { FixedStepClock } from "./fixed-step.controller";
import { FollowCameraController } from "./follow-camera.controller";
import { PositionInterpolator } from "./interpolation.controller";
import { FieldSceneController } from "./scene.controller";
import type { StandInWalkController } from "./stand-in-walk.controller";
import { heroTurnRate, overviewOffset } from "./view.constants";
import type { FieldCameraMode } from "./view.types";

const log = debugLog.create("view:field");

/**
 * The field on screen: the meadow scene, stepped at the sim's 30 Hz.
 *
 * Each display frame runs the sim steps that are due, then draws the hero
 * between its last two sim positions, turned toward the way it walks, and
 * lets the camera catch up. The field steps only while it waits for a
 * fight, and stops on the tick one starts.
 */
export class FieldViewController {
  /** The meadow's Three.js objects. */
  private readonly field: FieldSceneController;

  /** Whole sim steps from uneven display frames. */
  private readonly clock = new FixedStepClock(tickRate);

  /** Moves the hero and rolls encounters until input exists. */
  private readonly walk: StandInWalkController;

  /** The hero's last two sim positions. */
  private readonly motion: PositionInterpolator;

  /** Draws the scene each frame. */
  private readonly loop: RenderLoopController;

  /** The meadow, for reading the terrain under the hero. */
  private readonly map: MeadowMap;

  /** Trails the hero. Null when the camera is fixed over the whole meadow. */
  private readonly follow: FollowCameraController | null;

  /** Hands the fight's events to the caller. Null while no walk is running. */
  private waiting: ((events: readonly SimEvent[]) => void) | null = null;

  /** Which way the hero faces now, in radians. 0 faces south. */
  private facing = 0;

  /** Sim steps run since the field appeared. */
  private simTick = 0;

  /** The blended position drawn last frame. */
  private drawn: Position;

  constructor(input: {
    /** Draws the scene each frame. */
    loop: RenderLoopController;
    /** The seeded meadow. */
    map: MeadowMap;
    /** Terrain textures that loaded. */
    textures: Partial<Record<Terrain, Texture>>;
    /** The mob on the miniboss tile, such as `mob.rust_sentinel`. */
    minibossId: string;
    /** The run seed, shown on the dev panel. */
    seed: number;
    /** Moves the hero and rolls encounters. */
    walk: StandInWalkController;
    /** Follow the hero, or show the whole meadow. */
    cameraMode: FieldCameraMode;
  }) {
    this.loop = input.loop;
    this.map = input.map;
    this.field = new FieldSceneController(input.map, input.textures, input.minibossId);
    this.walk = input.walk;
    this.motion = new PositionInterpolator(this.walk.start());
    this.drawn = this.walk.start();
    this.field.placeHero(this.drawn, this.facing);

    this.follow =
      input.cameraMode === "follow" ? new FollowCameraController(this.loop.camera) : null;
    log(
      `meadow ${input.map.width}×${input.map.height}, seed ${input.seed}, ${input.cameraMode} camera`,
    );

    if (import.meta.env.DEV) {
      let ticksAtWindowStart = 0;
      let windowStart = performance.now();
      let simHz = 0;
      debugWatches.watch("seed", () => input.seed);
      debugWatches.watch("sim tick", () => this.simTick);
      debugWatches.watch("sim Hz", () => {
        const now = performance.now();
        if (now - windowStart >= 500) {
          simHz = Math.round(((this.simTick - ticksAtWindowStart) * 1000) / (now - windowStart));
          ticksAtWindowStart = this.simTick;
          windowStart = now;
        }
        return simHz;
      });
      debugWatches.watch("hero", () => `${this.drawn.x.toFixed(2)}, ${this.drawn.y.toFixed(2)}`);
      debugWatches.watch("terrain", () => this.terrainUnderHero());
    }
  }

  /**
   * Draws the field every frame and walks until a fight starts.
   * The hero stays where the walk left them, so the next call carries on from there.
   *
   * @returns The events of the move that started the fight, through the hero's first decision.
   */
  walkUntilFight(): Promise<readonly SimEvent[]> {
    return new Promise((resolve) => {
      this.waiting = resolve;
      this.aim();
      void this.loop.run(this.field.scene, (elapsed) => this.frame(elapsed));
    });
  }

  /** One display frame: due sim steps, then the blended hero. */
  private frame(elapsedSeconds: number): void {
    const steps = this.clock.advance(elapsedSeconds);
    for (let i = 0; i < steps && this.waiting; i++) {
      const step = this.walk.step();
      this.motion.push(step.position);
      this.simTick += 1;

      // The fight starts on this tick. Later steps wait for the next walk.
      const resolve = this.waiting;
      if (resolve && step.events.length > 0) {
        this.waiting = null;
        const started = step.events.find((event) => event.type === "encounterStarted");
        if (started?.type === "encounterStarted") {
          log(`fight on ${started.terrain}, tick ${this.simTick}`, started.groups);
        }
        resolve(step.events);
      }
    }

    this.drawn = this.motion.at(this.clock.blend);
    this.turnHero(elapsedSeconds);
    this.field.placeHero(this.drawn, this.facing);
    this.follow?.follow(this.field.heroFeet(), elapsedSeconds);
  }

  /** Eases the hero toward the way its last sim step went. Standing still keeps the facing. */
  private turnHero(elapsedSeconds: number): void {
    const step = this.motion.lastStep();
    if (step.x === 0 && step.y === 0) return;

    // North is −z on screen, so a step north faces away from the camera.
    const target = Math.atan2(step.x, -step.y);
    const turn = Math.atan2(Math.sin(target - this.facing), Math.cos(target - this.facing));
    const limit = heroTurnRate * elapsedSeconds;
    this.facing += Math.max(-limit, Math.min(limit, turn));
  }

  /** Puts the camera back on the field: on the hero, or over the whole meadow. */
  private aim(): void {
    if (this.follow) this.follow.snapTo(this.field.heroFeet());
    else this.aimOverview();
  }

  /** A fixed camera that shows the whole meadow from the south. */
  private aimOverview(): void {
    const { x, z } = this.field.center();
    this.loop.camera.position.set(x, overviewOffset.up, z + overviewOffset.south);
    this.loop.camera.lookAt(x, 0, z);
  }

  /** What the hero stands on, for the dev panel. */
  private terrainUnderHero(): string {
    const x = Math.floor(this.drawn.x);
    const y = Math.floor(this.drawn.y);
    return this.map.tiles[y * this.map.width + x] ?? "off the map";
  }
}
