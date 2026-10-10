import type { TerrainRecipe } from "./terrain.types.ts";

/** Pixels per side of a terrain texture. One texture covers one tile. */
export const terrainTextureSize = 16;

/** One recipe per generated texture: the meadow terrains, the skirt, and the forest fight. */
export const terrainRecipes: readonly TerrainRecipe[] = [
  {
    id: "terrain.grass.texture",
    seed: 1,
    palette: [
      { color: [74, 143, 58], weight: 6 },
      { color: [62, 122, 48], weight: 3 },
      { color: [98, 168, 72], weight: 2 },
      { color: [128, 184, 84], weight: 0.5 },
    ],
  },
  {
    id: "terrain.forest.texture",
    seed: 2,
    palette: [
      { color: [40, 92, 44], weight: 5 },
      { color: [30, 72, 36], weight: 4 },
      { color: [58, 112, 52], weight: 2 },
    ],
  },
  {
    id: "terrain.path.texture",
    seed: 3,
    palette: [
      { color: [184, 155, 98], weight: 6 },
      { color: [160, 132, 82], weight: 3 },
      { color: [206, 182, 128], weight: 2 },
      { color: [130, 110, 80], weight: 0.5 },
    ],
  },
  {
    id: "terrain.water.texture",
    seed: 4,
    palette: [
      { color: [52, 104, 170], weight: 6 },
      { color: [44, 90, 150], weight: 3 },
    ],
    streaks: { color: [120, 170, 220], everyRows: 4, length: 3 },
  },
  {
    id: "terrain.skirt.texture",
    seed: 8,
    palette: [
      { color: [92, 62, 36], weight: 6 },
      { color: [68, 44, 26], weight: 4 },
      { color: [48, 32, 20], weight: 2 },
    ],
  },
  {
    id: "combat.forest.floor",
    seed: 7,
    palette: [
      { color: [58, 34, 18], weight: 6 },
      { color: [36, 22, 12], weight: 4 },
      { color: [78, 48, 26], weight: 2 },
    ],
  },
  {
    id: "combat.forest.wall",
    seed: 6,
    palette: [
      { color: [16, 32, 20], weight: 6 },
      { color: [10, 22, 14], weight: 4 },
      { color: [26, 44, 26], weight: 2 },
    ],
  },
  {
    id: "terrain.mountain.texture",
    seed: 5,
    palette: [
      { color: [122, 116, 112], weight: 5 },
      { color: [98, 92, 90], weight: 3 },
      { color: [150, 144, 138], weight: 2 },
      { color: [70, 66, 66], weight: 0.7 },
    ],
  },
];
