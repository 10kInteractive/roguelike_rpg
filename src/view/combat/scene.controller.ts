import {
  BoxGeometry,
  Color,
  type Group,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  type Texture,
} from "three";
import type { Terrain } from "../../sim/field/map.types";
import { addSunAndSky } from "../art/lighting";
import { skyColor } from "../art/lighting.constants";
import { buildHeroModel, buildMobModel } from "../art/models";
import { mobLooks } from "../art/models.constants";
import { terrainFallbackColors } from "../art/terrain-textures.constants";
import { combatBackdrop, combatStage, idleBob } from "./scene.constants";
import type { StagedActor } from "./scene.types";

/**
 * The fight as Three.js objects: a meadow backdrop, the hero on the right,
 * and the pack lined up on the left.
 *
 * A pack is fought one mob at a time, so the mob being fought steps out
 * toward the hero and the rest wait behind it.
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

  /** Seconds since the scene appeared, for the idle bob. */
  private seconds = 0;

  /**
   * @param mobIds The pack in the order it is fought, such as `["mob.slime", "mob.ember_imp"]`.
   * @param textures Terrain textures for the backdrop. A missing one draws its fallback color.
   */
  constructor(mobIds: readonly string[], textures: Partial<Record<Terrain, Texture>>) {
    this.scene.background = new Color(skyColor);
    addSunAndSky(this.scene, { x: 0, z: 0 });
    this.addBackdrop(textures);

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

  /**
   * Moves the idle bob along for one display frame.
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

  /** A grass floor, a tree line, and mountains behind it, all from the terrain textures. */
  private addBackdrop(textures: Partial<Record<Terrain, Texture>>): void {
    const { floorSize, trees, mountains } = combatBackdrop;

    const floor = new Mesh(
      new PlaneGeometry(floorSize, floorSize).rotateX(-Math.PI / 2),
      this.floorMaterial(textures.grass, floorSize),
    );
    floor.name = "floor";
    this.scene.add(floor);

    const forest = this.material("forest", textures);
    for (let x = trees.from; x <= trees.to; x++) {
      this.addColumn(x, trees.z, trees.height, forest);
    }

    const mountain = this.material("mountain", textures);
    for (let x = mountains.from; x <= mountains.to; x++) {
      const i = x - mountains.from;
      const height = mountains.heights[i % mountains.heights.length] ?? 1;
      const nudge = mountains.nudges[i % mountains.nudges.length] ?? 0;
      this.addColumn(x, mountains.z + nudge, height, mountain);
    }
  }

  /** The grass texture tiled once per tile across the floor, or flat grass color. */
  private floorMaterial(grass: Texture | undefined, size: number): MeshLambertMaterial {
    if (!grass) return new MeshLambertMaterial({ color: terrainFallbackColors.grass });
    const tiled = grass.clone();
    tiled.wrapS = RepeatWrapping;
    tiled.wrapT = RepeatWrapping;
    tiled.repeat.set(size, size);
    tiled.needsUpdate = true;
    return new MeshLambertMaterial({ map: tiled });
  }

  /** A terrain's texture as a material, or its fallback color. */
  private material(
    terrain: Terrain,
    textures: Partial<Record<Terrain, Texture>>,
  ): MeshLambertMaterial {
    const texture = textures[terrain];
    return texture
      ? new MeshLambertMaterial({ map: texture })
      : new MeshLambertMaterial({ color: terrainFallbackColors[terrain] });
  }

  /** One backdrop column standing on the floor. */
  private addColumn(x: number, z: number, height: number, material: MeshLambertMaterial): void {
    const column = new Mesh(new BoxGeometry(1, height, 1).translate(0, height / 2, 0), material);
    column.position.set(x, 0, z);
    this.scene.add(column);
  }
}
