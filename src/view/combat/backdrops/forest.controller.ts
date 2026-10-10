import { Color, type Scene } from "three";
import type { BackdropTextures } from "./backdrop.types";
import { forestBackdrop, forestFloorFallback, forestWallFallback } from "./forest.constants";
import { backdropColumn, backdropFloor, backdropMaterial } from "./parts";

/**
 * The deep forest around a fight that started on a forest tile.
 *
 * A dark floor, tall trees behind the pack, and trees at either side.
 */
export class ForestBackdropController {
  /**
   * @param textures Terrain textures, including the brown floor and the green trees.
   */
  constructor(private readonly textures: BackdropTextures) {}

  /** Adds the floor and the trees, and darkens the sky. */
  add(scene: Scene): void {
    const { floorSize, sky, rows, sides } = forestBackdrop;
    scene.background = new Color(sky);

    const floor = backdropFloor(this.textures.forestFloor, forestFloorFallback, floorSize);
    floor.name = "floor";
    scene.add(floor);

    const canopy = backdropMaterial(this.textures.forestWall, forestWallFallback);
    for (const row of rows) {
      for (let x = row.from; x <= row.to; x++) {
        const height = row.heights[(x - row.from) % row.heights.length] ?? 1;
        scene.add(backdropColumn(x, row.z, height, canopy, "tree"));
      }
    }
    for (const side of sides) {
      scene.add(backdropColumn(side.x, side.z, side.height, canopy, "tree"));
    }
  }
}
