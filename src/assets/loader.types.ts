import type { Texture } from "three";

/** One pack after loading: what loaded, and what could not. */
export type LoadedPack = {
  /** Pack id, such as `biome.meadow`. */
  id: string;
  /** Textures that loaded, by asset id. */
  textures: ReadonlyMap<string, Texture>;
  /** Asset ids whose file is not in the build, such as models not made yet. */
  missing: readonly string[];
  /** Asset ids whose file exists but failed to load or decode. */
  failed: readonly string[];
  /** Asset ids of a kind the loader does not read yet, such as `.glb` models. */
  skipped: readonly string[];
};

/** How far a pack has got. Called once at the start and once per settled asset. */
export type PackProgress = {
  /** Pack id, such as `biome.meadow`. */
  packId: string;
  /** Assets settled so far, loaded or not. */
  settled: number;
  /** Assets in the pack. */
  total: number;
};
