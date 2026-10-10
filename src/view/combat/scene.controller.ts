import { Color, type Group, Scene } from "three";
import { addSunAndSky } from "../art/lighting";
import { skyColor } from "../art/lighting.constants";
import { buildHeroModel, buildMobModel } from "../art/models";
import { mobLooks } from "../art/models.constants";
import type { BackdropTextures, FightTerrain } from "./backdrops/backdrop.types";
import { ForestBackdropController } from "./backdrops/forest.controller";
import { MeadowBackdropController } from "./backdrops/meadow.controller";
import { combatStage, combatSway, combatSwaySeconds, idleBob } from "./scene.constants";
import type { StagedActor } from "./scene.types";

/**
 * The fight as Three.js objects: a backdrop for the ground it started on,
 * the hero on the right, and the pack lined up on the left.
 *
 * A pack is fought one mob at a time, so the mob being fought steps out
 * toward the hero and the rest wait behind it. Grass and path use the meadow.
 * Forest uses the deep-forest backdrop.
 */
export class CombatSceneController {
  /** Everything the render loop draws. */
  readonly scene = new Scene();

  /** The hero, facing west toward the pack. */
  private readonly hero: StagedActor;

  /** The pack in fight order, each facing east toward the hero. */
  private readonly pack: StagedActor[];

  /** Which mob in the pack is being fought. */
  private focused = 0;

  /** Seconds since the scene appeared, for the idle bob and the camera drift. */
  private seconds = 0;

  /**
   * @param mobIds The pack in the order it is fought, such as `["mob.slime", "mob.ember_imp"]`.
   * @param textures Terrain textures for the backdrop. A missing one draws its fallback color.
   * @param terrain Where the fight started. Grass and path are the meadow. Forest is the woods.
   */
  constructor(
    mobIds: readonly string[],
    textures: BackdropTextures,
    terrain: FightTerrain = "grass",
  ) {
    this.scene.background = new Color(skyColor);
    addSunAndSky(this.scene, { x: 0, z: 0 });
    if (terrain === "forest") new ForestBackdropController(textures).add(this.scene);
    else new MeadowBackdropController(textures).add(this.scene);

    this.hero = this.stage(buildHeroModel(), combatStage.hero, -Math.PI / 2, idleBob.height, 0);
    this.pack = mobIds.map((mobId, index) => {
      const home = {
        x: combatStage.pack.x - index * combatStage.packStagger,
        z: combatStage.pack.z - index * combatStage.packSpacing,
      };
      const bob = mobLooks[mobId]?.hover ? idleBob.hoverHeight : idleBob.height;
      return this.stage(buildMobModel(mobId), home, Math.PI / 2, bob, index + 1);
    });
    this.focus(0);
  }

  /**
   * Steps one mob out toward the hero and sends the others back to their spots.
   *
   * @param index Position in the pack, in fight order.
   */
  focus(index: number): void {
    this.focused = index;
    this.pack.forEach((actor, i) => {
      const step = i === index ? combatStage.focusStep : 0;
      actor.model.position.x = actor.home.x + step;
    });
  }

  /** The mob being fought, by position in the pack. */
  focusedIndex(): number {
    return this.focused;
  }

  /** The hero on the stage, for the sequencer to animate. */
  heroActor(): StagedActor {
    return this.hero;
  }

  /** The mob being fought, for the sequencer to animate. */
  focusedActor(): StagedActor | undefined {
    return this.pack[this.focused];
  }

  /** How far the camera has drifted on x. Zero at the start of the fight. */
  sway(): number {
    const turn = (this.seconds / combatSwaySeconds) * Math.PI * 2;
    return Math.sin(turn) * combatSway;
  }

  /**
   * Moves the idle bob and the camera drift along for one display frame.
   *
   * @param elapsedSeconds Time since the last frame.
   */
  animate(elapsedSeconds: number): void {
    this.seconds += elapsedSeconds;
    for (const actor of [this.hero, ...this.pack]) {
      const turn = (this.seconds * idleBob.perSecond + actor.phase * 0.37) * Math.PI * 2;
      const bob = actor.down ? 0 : (Math.sin(turn) * 0.5 + 0.5) * actor.bob;
      actor.model.position.y = bob + actor.lift;
    }
  }

  /** Places a model at its spot, turned to face the other side, and adds it to the scene. */
  private stage(
    model: Group,
    home: { x: number; z: number },
    facing: number,
    bob: number,
    phase: number,
  ): StagedActor {
    model.position.set(home.x, 0, home.z);
    model.rotation.y = facing;
    this.scene.add(model);
    return { model, home, bob, phase, lift: 0, down: false };
  }
}
