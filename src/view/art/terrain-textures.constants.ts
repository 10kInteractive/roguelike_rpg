import type { Terrain } from "../../sim/field/map.types";

/** The asset id of each terrain's texture. */
export const terrainTextureIds: Record<Terrain, string> = {
  grass: "terrain.grass.texture",
  forest: "terrain.forest.texture",
  path: "terrain.path.texture",
  water: "terrain.water.texture",
  mountain: "terrain.mountain.texture",
};

/** The flat color a terrain uses when its texture fails to load. */
export const terrainFallbackColors: Record<Terrain, number> = {
  grass: 0x4a8f3a,
  forest: 0x285c2c,
  path: 0xb89b62,
  water: 0x3468aa,
  mountain: 0x7a7470,
};
