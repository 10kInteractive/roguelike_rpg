import type { Terrain } from "../sim/field/map.types";

/** How tall each terrain's column stands, in tile widths. Water sits low, mountains tower. */
export const terrainHeights: Record<Terrain, number> = {
  water: 0.3,
  path: 0.55,
  grass: 0.6,
  forest: 0.85,
  mountain: 1.8,
};

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

/** The placeholder hero: a gold block with a pale nose on the side it faces. */
export const heroLook = { color: 0xc4a35a, noseColor: 0xf2e6c4, width: 0.45, height: 0.7 };

/** The placeholder Rust Sentinel: a tall rust-red block. */
export const minibossLook = { color: 0xa0482c, width: 0.9, height: 1.4 };

/** Sky color behind the meadow. */
export const skyColor = 0x9cc8e8;

/** Ground bounce color for the sky light. */
export const groundBounceColor = 0x3a4a2a;
