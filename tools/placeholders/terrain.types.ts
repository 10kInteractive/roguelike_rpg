import type { Weighted } from "../../src/sim/utils/weighted.types.ts";
import type { Rgb } from "./pixel-image.types.ts";

/** One color a texture may use, and its share of the pixels. */
export type PaletteEntry = Weighted & {
  /** The color. */
  color: Rgb;
};

/** Short light dashes across a texture, such as ripples on water. */
export type Streaks = {
  /** The dash color. */
  color: Rgb;
  /** Every this many rows gets one dash. */
  everyRows: number;
  /** Pixels per dash. */
  length: number;
};

/** How to paint one terrain texture. */
export type TerrainRecipe = {
  /** Logical asset id, such as `terrain.grass.texture`. */
  id: string;
  /** Seed for which pixel gets which color. */
  seed: number;
  /** Colors scattered by weight. */
  palette: readonly PaletteEntry[];
  /** Dashes painted over the scatter. */
  streaks?: Streaks;
};

/** What a sidecar records about one generated file. */
export type Sidecar = {
  /** Logical asset id. */
  id: string;
  /** The script that wrote the file. */
  generator: string;
  /** Seed the script used. */
  seed: number;
  /** Width and height in pixels. */
  size: number;
  /** The recipe the pixels came from. */
  recipe: TerrainRecipe;
  /** When the pixels last changed, as an ISO date. */
  generatedAt: string;
};
