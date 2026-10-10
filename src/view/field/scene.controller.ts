import {
  BoxGeometry,
  Color,
  type Group,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Scene,
  type Texture,
  type Vector3,
} from "three";
import type { MeadowMap, Terrain, TilePoint } from "../../sim/field/map.types";
import type { Position } from "../../sim/field/movement.types";
import { addSunAndSky } from "../art/lighting";
import { skyColor } from "../art/lighting.constants";
import { buildHeroModel, buildMobModel } from "../art/models";
import { heroLook } from "../art/person/model.constants";
import { terrainFallbackColors } from "../art/terrain-textures.constants";
import type { BackdropTextures } from "../combat/backdrops/backdrop.types";
import { fieldSkirtTiles, skirtFallback, terrainHeights } from "./scene.constants";

/**
 * The meadow as Three.js objects: tile columns, the hero, the miniboss, and light.
 *
 * Sim tiles run east along x and north along y. The scene puts east on +x,
 * north on −z, and up on +y, so a tile's column stands at `(x + 0.5, −(y + 0.5))`.
 */
export class FieldSceneController {
  /** Everything the render loop draws. */
  readonly scene = new Scene();

  /** The placeholder hero. Its local +z is the way it faces. */
  private readonly hero: Group;

  /** Ground height under each tile, row-major, so the hero stands on top. */
  private readonly heights: number[];

  /** The meadow this scene was built from. */
  private readonly map: MeadowMap;

  /**
   * @param map The seeded meadow.
   * @param textures Each terrain's texture, and the skirt. A missing one draws its fallback color.
   * @param minibossId The mob standing on the miniboss tile, such as `mob.rust_sentinel`.
   */
  constructor(map: MeadowMap, textures: BackdropTextures, minibossId: string) {
    this.map = map;
    this.heights = map.tiles.map((terrain) => terrainHeights[terrain]);
    this.scene.background = new Color(skyColor);

    this.addTiles(textures);
    this.addSkirt(textures.skirt);
    addSunAndSky(this.scene, this.center());
    this.addMiniboss(map.miniboss, minibossId);
    this.hero = buildHeroModel();
    this.scene.add(this.hero);
  }

  /**
   * Stands the hero at a sim position, facing a direction.
   *
   * @param position Sim tiles, east and north.
   * @param facing Radians about the vertical axis. 0 faces south, toward the camera.
   */
  placeHero(position: Position, facing: number): void {
    // In the forest the canopy hides the lower half, so the hero looks waist-deep.
    const sink = this.terrainAt(position) === "forest" ? heroLook.height / 2 : 0;
    this.hero.position.set(position.x, this.groundAt(position) - sink, -position.y);
    this.hero.rotation.y = facing;
  }

  /** Where the hero's feet are in the scene, as last placed. */
  heroFeet(): Vector3 {
    return this.hero.position.clone();
  }

  /** The middle of the meadow, at ground level, for the camera to aim at. */
  center(): { x: number; z: number } {
    return { x: this.map.width / 2, z: -this.map.height / 2 };
  }

  /** One instanced column mesh per terrain, so the whole meadow is five draw calls. */
  private addTiles(textures: BackdropTextures): void {
    const byTerrain = new Map<Terrain, TilePoint[]>();
    this.map.tiles.forEach((terrain, index) => {
      const tiles = byTerrain.get(terrain) ?? [];
      tiles.push({ x: index % this.map.width, y: Math.floor(index / this.map.width) });
      byTerrain.set(terrain, tiles);
    });

    const place = new Matrix4();
    for (const [terrain, tiles] of byTerrain) {
      // A unit box raised so its base sits at y = 0, then scaled to the terrain's height.
      const height = terrainHeights[terrain];
      const geometry = new BoxGeometry(1, height, 1).translate(0, height / 2, 0);
      const texture = textures[terrain];
      const material = texture
        ? new MeshLambertMaterial({ map: texture })
        : new MeshLambertMaterial({ color: terrainFallbackColors[terrain] });
      const columns = new InstancedMesh(geometry, material, tiles.length);
      tiles.forEach((tile, i) => {
        columns.setMatrixAt(i, place.makeTranslation(tile.x + 0.5, 0, -(tile.y + 0.5)));
      });
      columns.name = `tiles.${terrain}`;
      this.scene.add(columns);
    }
  }

  /**
   * Dark brown earth around the meadow, so the follow camera sees ground past the map edge.
   *
   * @param texture The skirt texture. Missing, the skirt uses its fallback color.
   */
  private addSkirt(texture: Texture | undefined): void {
    const margin = fieldSkirtTiles;
    const width = this.map.width;
    const height = this.map.height;
    const count = (width + margin * 2) * (height + margin * 2) - width * height;
    const heightTiles = terrainHeights.grass;
    const geometry = new BoxGeometry(1, heightTiles, 1).translate(0, heightTiles / 2, 0);
    const material = texture
      ? new MeshLambertMaterial({ map: texture })
      : new MeshLambertMaterial({ color: skirtFallback });
    const columns = new InstancedMesh(geometry, material, count);
    const place = new Matrix4();
    let i = 0;

    // Tiles outside the map, from the southwest corner across each row.
    for (let y = -margin; y < height + margin; y++) {
      for (let x = -margin; x < width + margin; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) continue;
        columns.setMatrixAt(i, place.makeTranslation(x + 0.5, 0, -(y + 0.5)));
        i += 1;
      }
    }

    columns.name = "tiles.skirt";
    this.scene.add(columns);
  }

  /** The miniboss standing on its tile, facing south toward the camera. */
  private addMiniboss(tile: TilePoint, minibossId: string): void {
    const miniboss = buildMobModel(minibossId);
    const center = { x: tile.x + 0.5, y: tile.y + 0.5 };
    miniboss.position.set(center.x, this.groundAt(center), -center.y);
    miniboss.name = "miniboss";
    this.scene.add(miniboss);
  }

  /** The top of the column under a sim position. Off the map is ground level. */
  private groundAt(position: Position): number {
    const index = this.tileIndex(position);
    if (index === undefined) return 0;
    return this.heights[index] ?? 0;
  }

  /** The terrain under a sim position, or nothing off the map. */
  private terrainAt(position: Position): Terrain | undefined {
    const index = this.tileIndex(position);
    return index === undefined ? undefined : this.map.tiles[index];
  }

  /** The row-major index of the tile under a sim position, or nothing off the map. */
  private tileIndex(position: Position): number | undefined {
    const x = Math.floor(position.x);
    const y = Math.floor(position.y);
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return undefined;
    return y * this.map.width + x;
  }
}
