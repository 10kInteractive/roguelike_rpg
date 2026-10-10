import type { Scene } from "three";
import { terrainFallbackColors } from "../../art/terrain-textures.constants";
import type { BackdropTextures } from "./backdrop.types";
import { meadowBackdrop } from "./meadow.constants";
import { backdropColumn, backdropFloor, backdropMaterial, backdropSlab } from "./parts";

/**
 * The open meadow behind a fight on grass or path.
 *
 * A grass floor, bushes, a low tree line, and mountains past it.
 * Rocks sit on the near ground, off to either side.
 */
export class MeadowBackdropController {
  /**
   * @param textures Terrain textures. A missing one draws its fallback color.
   */
  constructor(private readonly textures: BackdropTextures) {}

  /** Adds the floor, the near ground, the bushes, the trees, and the mountains. */
  add(scene: Scene): void {
    const { floorSize, bushes, near, trees, mountains } = meadowBackdrop;

    const floor = backdropFloor(this.textures.grass, terrainFallbackColors.grass, floorSize);
    floor.name = "floor";
    scene.add(floor);

    const forest = backdropMaterial(this.textures.forest, terrainFallbackColors.forest);
    const rock = backdropMaterial(this.textures.mountain, terrainFallbackColors.mountain);
    for (const piece of near) {
      const material = piece.kind === "rock" ? rock : forest;
      scene.add(
        backdropSlab(piece.x, piece.z, piece.width, piece.height, piece.depth, material, "near"),
      );
    }
    for (const bush of bushes) {
      scene.add(backdropColumn(bush.x, bush.z, bush.height, forest, "bush"));
    }
    for (let x = trees.from; x <= trees.to; x++) {
      scene.add(backdropColumn(x, trees.z, trees.height, forest, "tree"));
    }

    for (let x = mountains.from; x <= mountains.to; x++) {
      const i = x - mountains.from;
      const height = mountains.heights[i % mountains.heights.length] ?? 1;
      const nudge = mountains.nudges[i % mountains.nudges.length] ?? 0;
      scene.add(backdropColumn(x, mountains.z + nudge, height, rock, "mountain"));
    }
  }
}
