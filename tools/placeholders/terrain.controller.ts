import { SeededRandomGenerator } from "../../src/sim/utils/rng.controller.ts";
import { pickWeightedListEntry } from "../../src/sim/utils/weighted.ts";
import { PixelImage } from "./pixel-image.controller.ts";
import type { TerrainRecipe } from "./terrain.types.ts";

/**
 * Paints one terrain texture from its recipe.
 *
 * Every pixel rolls a palette color by weight. Streaks, when the recipe has
 * them, then lay one dash per band of rows at a rolled column, wrapping at the
 * right edge so neighboring tiles line up. The same recipe always paints the
 * same pixels.
 */
export class TerrainTexturePainter {
  /** Rolls for colors and dash positions. */
  private readonly rng: SeededRandomGenerator;

  /**
   * @param recipe The colors, seed, and streaks.
   * @param size Pixels per side.
   */
  constructor(
    private readonly recipe: TerrainRecipe,
    private readonly size: number,
  ) {
    this.rng = new SeededRandomGenerator(recipe.seed);
  }

  /** The finished texture. */
  paint(): PixelImage {
    const image = new PixelImage(this.size, this.size);

    // Scatter the palette.
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        image.set(x, y, pickWeightedListEntry(this.recipe.palette, this.rng.next()).color);
      }
    }

    // One dash per band of rows, wrapping so the texture tiles.
    const streaks = this.recipe.streaks;
    if (streaks) {
      for (let y = 1; y < this.size; y += streaks.everyRows) {
        const start = Math.floor(this.rng.next() * this.size);
        for (let i = 0; i < streaks.length; i++) {
          image.set((start + i) % this.size, y, streaks.color);
        }
      }
    }

    return image;
  }
}
