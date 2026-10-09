import { NearestFilter, SRGBColorSpace, type Texture, TextureLoader } from "three";
import type { Bundle } from "../content/schema";
import { debugLog } from "../debug/logger.controller";
import type { Terrain } from "../sim/field/map.types";
import { terrainTextureIds } from "./field-scene.constants";

const log = debugLog.create("view:assets");

/**
 * Loads the terrain textures named in a bundle's asset manifest.
 *
 * Pixel art stays crisp: no smoothing when a texel covers many screen pixels.
 * A texture that fails to load is left out, and the scene draws that
 * terrain in its fallback color.
 */
export class TerrainTextureLoader {
  /** File for each asset id, from every pack in the manifest. */
  private readonly files: Map<string, string>;

  /** Prefix for asset files, such as `/` in dev or `/roguelike_rpg/` when deployed. */
  private readonly baseUrl: string;

  /**
   * @param assets The bundle's asset manifest.
   * @param baseUrl Prefix for asset files.
   */
  constructor(assets: Bundle["assets"], baseUrl: string) {
    this.files = new Map(
      assets.packs.flatMap((pack) => pack.assets.map((asset) => [asset.id, asset.file])),
    );
    this.baseUrl = baseUrl;
  }

  /** Every terrain texture that loaded. */
  async load(): Promise<Partial<Record<Terrain, Texture>>> {
    const loader = new TextureLoader();
    const loaded: Partial<Record<Terrain, Texture>> = {};
    const terrains = Object.keys(terrainTextureIds) as Terrain[];
    await Promise.all(
      terrains.map(async (terrain) => {
        const id = terrainTextureIds[terrain];
        const file = this.files.get(id);
        if (!file) {
          console.warn(
            `[view:assets] ${id} is not in the asset manifest. Using its fallback color.`,
          );
          return;
        }
        try {
          const texture = await loader.loadAsync(`${this.baseUrl}${file}`);
          texture.magFilter = NearestFilter;
          texture.minFilter = NearestFilter;
          texture.colorSpace = SRGBColorSpace;
          loaded[terrain] = texture;
          log("loaded", id);
        } catch {
          console.warn(
            `[view:assets] ${id} failed to load from ${file}. Using its fallback color.`,
          );
        }
      }),
    );
    return loaded;
  }
}
