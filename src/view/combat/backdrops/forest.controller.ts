import { Color, type Scene } from "three";
import type { BackdropTextures } from "./backdrop.types";
import { forestBackdrop, forestFloorFallback, forestWallFallback } from "./forest.constants";
import { backdropColumn, backdropFloor, backdropMaterial, backdropSlab } from "./parts";

/**
 * The deep forest around a fight that started on a forest tile.
 *
 * A dark floor, tall trees behind the pack, trees at either side,
 * and logs and roots on the near ground.
 */
export class ForestBackdropController {
  /**
   * @param textures Terrain textures, including the brown floor and the green trees.
   */
  constructor(private readonly textures: BackdropTextures) {}

  /** Adds the floor, the near ground, and the trees, and darkens the sky. */
  add(scene: Scene): void {
    const { floorSize, sky, near, rows, sides } = forestBackdrop;
    scene.background = new Color(sky);

    const floor = backdropFloor(this.textures.forestFloor, forestFloorFallback, floorSize);
    floor.name = "floor";
    scene.add(floor);

    const canopy = backdropMaterial(this.textures.forestWall, forestWallFallback);
    const earth = backdropMaterial(this.textures.forestFloor, forestFloorFallback);
    for (const piece of near) {
      const material = piece.kind === "root" ? canopy : earth;
      scene.add(
        backdropSlab(piece.x, piece.z, piece.width, piece.height, piece.depth, material, "near"),
      );
    }
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
