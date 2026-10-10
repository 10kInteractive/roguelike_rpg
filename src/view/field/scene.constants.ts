import type { Terrain } from "../../sim/field/map.types";

/**
 * Grass tiles drawn around the meadow, on every side.
 *
 * The follow camera sits 8 tiles south of the hero and 9 up. On a wide window
 * its view reaches about this far past the map, so the edge shows ground.
 * The sim map does not include these tiles, and the hero cannot walk there.
 */
export const fieldSkirtTiles = 24;

/** How tall each terrain's column stands, in tile widths. Water sits low, mountains tower. */
export const terrainHeights: Record<Terrain, number> = {
  water: 0.3,
  path: 0.55,
  grass: 0.6,
  forest: 0.85,
  mountain: 1.8,
};
