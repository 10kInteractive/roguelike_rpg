import {
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Scene,
  type Texture,
} from "three";
import type { MeadowMap, Terrain, TilePoint } from "../sim/field/map.types";
import type { Position } from "../sim/field/movement.types";
import {
  groundBounceColor,
  heroLook,
  minibossLook,
  skyColor,
  terrainFallbackColors,
  terrainHeights,
} from "./field-scene.constants";

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
   * @param textures Each terrain's texture. A missing one draws its fallback color.
   */
  constructor(map: MeadowMap, textures: Partial<Record<Terrain, Texture>>) {
    this.map = map;
    this.heights = map.tiles.map((terrain) => terrainHeights[terrain]);
    this.scene.background = new Color(skyColor);

    this.addTiles(textures);
    this.addLight();
    this.addMiniboss(map.miniboss);
    this.hero = this.buildHero();
    this.scene.add(this.hero);
  }

  /**
   * Stands the hero at a sim position, facing a direction.
   *
   * @param position Sim tiles, east and north.
   * @param facing Radians about the vertical axis. 0 faces south, toward the camera.
   */
  placeHero(position: Position, facing: number): void {
    this.hero.position.set(position.x, this.groundAt(position), -position.y);
    this.hero.rotation.y = facing;
  }

  /** The middle of the meadow, at ground level, for the camera to aim at. */
  center(): { x: number; z: number } {
    return { x: this.map.width / 2, z: -this.map.height / 2 };
  }

  /** One instanced column mesh per terrain, so the whole meadow is five draw calls. */
  private addTiles(textures: Partial<Record<Terrain, Texture>>): void {
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

  /** A sun from the southwest, high up, and a sky light that tints from above. */
  private addLight(): void {
    const sun = new DirectionalLight(0xfff2d8, 2.2);
    const { x, z } = this.center();
    sun.position.set(x - 20, 40, z + 30);
    sun.target.position.set(x, 0, z);
    this.scene.add(sun, sun.target);
    this.scene.add(new HemisphereLight(skyColor, groundBounceColor, 1.2));
  }

  /** The Rust Sentinel standing on its tile. */
  private addMiniboss(tile: TilePoint): void {
    const { color, width, height } = minibossLook;
    const body = new Mesh(
      new BoxGeometry(width, height, width).translate(0, height / 2, 0),
      new MeshLambertMaterial({ color }),
    );
    const center = { x: tile.x + 0.5, y: tile.y + 0.5 };
    body.position.set(center.x, this.groundAt(center), -center.y);
    body.name = "miniboss";
    this.scene.add(body);
  }

  /** The hero block and a nose on its +z side, so facing is visible from above. */
  private buildHero(): Group {
    const { color, noseColor, width, height } = heroLook;
    const body = new Mesh(
      new BoxGeometry(width, height, width).translate(0, height / 2, 0),
      new MeshLambertMaterial({ color }),
    );
    const nose = new Mesh(
      new BoxGeometry(width * 0.4, width * 0.4, width * 0.4),
      new MeshLambertMaterial({ color: noseColor }),
    );
    nose.position.set(0, height * 0.7, width / 2 + width * 0.15);
    const hero = new Group();
    hero.add(body, nose);
    hero.name = "hero";
    return hero;
  }

  /** The top of the column under a sim position. Off the map is ground level. */
  private groundAt(position: Position): number {
    const x = Math.floor(position.x);
    const y = Math.floor(position.y);
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return 0;
    return this.heights[y * this.map.width + x] ?? 0;
  }
}
