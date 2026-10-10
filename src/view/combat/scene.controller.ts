import {
  Color,
  DataTexture,
  DoubleSide,
  type Group,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
} from "three";
import { addSunAndSky } from "../art/lighting";
import { skyColor } from "../art/lighting.constants";
import { buildHeroModel, buildMobModel } from "../art/models";
import { mobLooks } from "../art/models.constants";
import type { BackdropTextures, FightTerrain } from "./backdrops/backdrop.types";
import { ForestBackdropController } from "./backdrops/forest.controller";
import { MeadowBackdropController } from "./backdrops/meadow.controller";
import {
  combatStage,
  combatSway,
  combatSwaySeconds,
  idleBob,
  selectionRing,
} from "./scene.constants";
import type { StagedActor } from "./scene.types";

/**
 * The fight as Three.js objects: a backdrop for the ground it started on,
 * the hero on the right, and the pack in two lines on the left.
 *
 * One mob stands nearer the hero, still on the left of the field. Up to two
 * stand further west, one to either side. The mob being fought can step out
 * toward the hero. Choosing one does not move the pack: a thin circle on the
 * ground sits under the mob in focus, including one further from the hero.
 * Grass and path use the meadow. Forest uses the deep-forest backdrop.
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

  /** The ring on the ground under the mob the player is choosing. */
  private readonly ring: Mesh;

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
      const home = this.homeAt(index, mobIds.length);
      const bob = mobLooks[mobId]?.hover ? idleBob.hoverHeight : idleBob.height;
      return this.stage(buildMobModel(mobId), home, Math.PI / 2, bob, index + 1);
    });
    this.ring = this.selectionRing();
    this.ringAt(0);
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
      actor.model.position.z = actor.home.z;
    });
  }

  /**
   * Puts the ring under one mob. The pack stays where it is standing.
   *
   * @param index Position in the pack. Null hides the ring.
   */
  ringAt(index: number | null): void {
    if (index === null) {
      this.ring.visible = false;
      return;
    }
    const actor = this.pack[index];
    if (!actor) return;
    this.focused = index;
    this.ring.visible = !actor.down;
    this.ring.position.set(actor.home.x, selectionRing.y, actor.home.z);
  }

  /** Encounter indices that have not fallen, front of the original line first. */
  standing(): number[] {
    return this.pack.flatMap((actor, index) => (actor.down ? [] : [index]));
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

  /** A flat circle on the ground: one pixel line on a clear texture. */
  private selectionRing(): Mesh {
    const ring = new Mesh(
      new PlaneGeometry(selectionRing.size, selectionRing.size),
      new MeshBasicMaterial({
        map: this.ringTexture(),
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
    ring.name = "selection-ring";
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 1;
    this.scene.add(ring);
    return ring;
  }

  /** A one-pixel circle, with the rest of the square left clear. */
  private ringTexture(): DataTexture {
    const { pixels, color } = selectionRing;
    const data = new Uint8Array(pixels * pixels * 4);
    this.paintCircle(data, pixels, color);
    const texture = new DataTexture(data, pixels, pixels);
    texture.colorSpace = SRGBColorSpace;
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  /** Writes a circle outline into the texture. The background stays transparent. */
  private paintCircle(data: Uint8Array, pixels: number, color: number): void {
    const radius = Math.floor(pixels / 2) - 1;
    const center = Math.floor(pixels / 2);
    const red = (color >> 16) & 255;
    const green = (color >> 8) & 255;
    const blue = color & 255;
    let x = radius;
    let y = 0;
    let decision = 1 - radius;

    const plot = (px: number, py: number) => {
      if (px < 0 || py < 0 || px >= pixels || py >= pixels) return;
      const index = (py * pixels + px) * 4;
      data[index] = red;
      data[index + 1] = green;
      data[index + 2] = blue;
      data[index + 3] = Math.round(selectionRing.alpha * 255);
    };

    while (x >= y) {
      plot(center + x, center + y);
      plot(center + y, center + x);
      plot(center - y, center + x);
      plot(center - x, center + y);
      plot(center - x, center - y);
      plot(center - y, center - x);
      plot(center + y, center - x);
      plot(center + x, center - y);
      y += 1;
      if (decision <= 0) decision += 2 * y + 1;
      else {
        x -= 1;
        decision += 2 * (y - x) + 1;
      }
    }
  }

  /**
   * Where one mob stands. The first stands nearer the hero. The rest stand
   * further west, spread north and south around the near mob.
   */
  private homeAt(index: number, count: number): { x: number; z: number } {
    const front = Math.min(combatStage.frontCount, count);
    const inFront = index < front;
    const rowCount = inFront ? front : count - front;
    const rowIndex = inFront ? index : index - front;
    const span = Math.max(0, rowCount - 1) * combatStage.fileGap;
    return {
      x: inFront ? combatStage.pack.x : combatStage.pack.x - combatStage.rowGap,
      z: combatStage.pack.z - span / 2 + rowIndex * combatStage.fileGap,
    };
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
