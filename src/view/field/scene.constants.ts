import type { Terrain } from "../../sim/field/map.types";

/** How tall each terrain's column stands, in tile widths. Water sits low, mountains tower. */
export const terrainHeights: Record<Terrain, number> = {
  water: 0.3,
  path: 0.55,
  grass: 0.6,
  forest: 0.85,
  mountain: 1.8,
};
