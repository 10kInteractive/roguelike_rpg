import type { Texture } from "three";
import { debugLog } from "../../debug/logger.controller";
import { debugWatches } from "../../debug/watch.controller";
import type { Terrain } from "../../sim/field/map.types";
import type { RenderLoopController } from "../renderer.controller";
import { combatCamera } from "./scene.constants";
import { CombatSceneController } from "./scene.controller";

const log = debugLog.create("view:combat");

/**
 * A fight on screen: the combat scene from a fixed camera, idling.
 *
 * The combat sequencer will play fight events here. Until then the lineup
 * stands and bobs, with the first mob of the pack stepped out.
 */
export class CombatViewController {
  /** The fight's Three.js objects. */
  private readonly combat: CombatSceneController;

  /** Draws the scene each frame. */
  private readonly loop: RenderLoopController;

  constructor(input: {
    /** Draws the scene each frame. */
    loop: RenderLoopController;
    /** The pack in the order it is fought. */
    mobIds: readonly string[];
    /** Terrain textures for the backdrop. */
    textures: Partial<Record<Terrain, Texture>>;
  }) {
    this.loop = input.loop;
    this.combat = new CombatSceneController(input.mobIds, input.textures);
    this.aim();
    log(`pack: ${input.mobIds.join(", ")}`);

    if (import.meta.env.DEV) {
      debugWatches.watch("pack", () => input.mobIds.join(", "));
      debugWatches.watch("fighting", () => input.mobIds[this.combat.focusedIndex()] ?? "nobody");
    }
  }

  /** Starts drawing the fight every frame. */
  async start(): Promise<void> {
    await this.loop.run(this.combat.scene, (elapsed) => this.combat.animate(elapsed));
  }

  /** The fixed combat camera, south of the stage and a little above it. */
  private aim(): void {
    const { position, lookAt } = combatCamera;
    this.loop.camera.position.set(position.x, position.y, position.z);
    this.loop.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
  }
}
