import type { Texture } from "three";
import { debugLog } from "../debug/logger.controller";
import { debugWatches } from "../debug/watch.controller";
import type { MeadowMap, Terrain } from "../sim/field/map.types";
import { tickRate } from "../sim/field/movement.constants";
import type { Position } from "../sim/field/movement.types";
import type { Rng } from "../sim/utils/rng.types";
import { FieldSceneController } from "./field-scene.controller";
import { heroTurnRate, overviewOffset } from "./field-view.constants";
import { FixedStepClock } from "./fixed-step.controller";
import { PositionInterpolator } from "./interpolation.controller";
import type { RenderLoopController } from "./renderer.controller";
import { StandInWalkController } from "./stand-in-walk.controller";

const log = debugLog.create("view:field");

/**
 * The field on screen: the meadow scene, stepped at the sim's 30 Hz.
 *
 * Each display frame runs the sim steps that are due, then draws the hero
 * between its last two sim positions, turned toward the way it walks.
 */
export class FieldViewController {
  /** The meadow's Three.js objects. */
  private readonly field: FieldSceneController;

  /** Whole sim steps from uneven display frames. */
  private readonly clock = new FixedStepClock(tickRate);

  /** Moves the hero until input exists. */
  private readonly walk: StandInWalkController;

  /** The hero's last two sim positions. */
  private readonly motion: PositionInterpolator;

  /** Draws the scene each frame. */
  private readonly loop: RenderLoopController;

  /** The meadow, for reading the terrain under the hero. */
  private readonly map: MeadowMap;

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
    /** The run seed, shown on the dev panel. */
    seed: number;
    /** Direction rolls for the stand-in walk. */
    rng: Rng;
  }) {
    this.loop = input.loop;
    this.map = input.map;
    this.field = new FieldSceneController(input.map, input.textures);
    this.walk = new StandInWalkController(input.map, input.rng);
    this.motion = new PositionInterpolator(this.walk.start());
    this.drawn = this.walk.start();
    this.aimOverview();
    log(`meadow ${input.map.width}×${input.map.height}, seed ${input.seed}`);

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

  /** Starts drawing the field every frame. */
  async start(): Promise<void> {
    await this.loop.run(this.field.scene, (elapsed) => this.frame(elapsed));
  }

  /** One display frame: due sim steps, then the blended hero. */
  private frame(elapsedSeconds: number): void {
    const steps = this.clock.advance(elapsedSeconds);
    for (let i = 0; i < steps; i++) {
      this.motion.push(this.walk.step());
      this.simTick += 1;
    }

    this.drawn = this.motion.at(this.clock.blend);
    this.turnHero(elapsedSeconds);
    this.field.placeHero(this.drawn, this.facing);
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
