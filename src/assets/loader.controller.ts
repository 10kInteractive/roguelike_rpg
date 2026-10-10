import { NearestFilter, SRGBColorSpace, type Texture, TextureLoader } from "three";
import type { Bundle } from "../content/schema";
import { debugLog } from "../debug/logger.controller";
import type { LoadedPack, PackProgress } from "./loader.types";

const log = debugLog.create("assets");

/** Where a hand-built file replaces the generated one of the same name. */
const authoredRoot = "assets/authored/";

/** Where the manifest's files live, until an authored file replaces one. */
const generatedRoot = "assets/generated/";

/**
 * The one place asset files are fetched: packs from a bundle's manifest, on demand.
 *
 * Each pack loads once. Asking again returns the same load. A file that is not
 * in the build is reported as missing without a fetch, a file that fails is
 * reported as failed, and neither stops the rest of the pack. Pixel art stays
 * crisp: textures do not smooth when a texel covers many screen pixels.
 */
export class AssetLoaderController {
  /** The bundle's packs, by id. */
  private readonly packs: Map<string, Bundle["assets"]["packs"][number]>;

  /** Built URL for each asset file in the build. */
  private readonly urls: ReadonlyMap<string, string>;

  /** Fetches and decodes one image. */
  private readonly fetchTexture: (url: string) => Promise<Texture>;

  /** Extra wait before each asset settles, so progress shows on a fast machine. Dev only. */
  private readonly delayMs: number;

  /** Packs started, so a second ask shares the first load. */
  private readonly loads = new Map<string, Promise<LoadedPack>>();

  constructor(input: {
    /** The bundle's asset manifest. */
    manifest: Bundle["assets"];
    /** Built URL for each asset file, keyed as the manifest writes it. */
    urls: ReadonlyMap<string, string>;
    /** Fetches and decodes one image. Defaults to Three.js's texture loader. */
    fetchTexture?: (url: string) => Promise<Texture>;
    /** Extra wait before each asset settles. Defaults to none. */
    delayMs?: number;
  }) {
    this.packs = new Map(input.manifest.packs.map((pack) => [pack.id, pack]));
    this.urls = input.urls;
    this.fetchTexture = input.fetchTexture ?? ((url) => new TextureLoader().loadAsync(url));
    this.delayMs = input.delayMs ?? 0;
  }

  /**
   * Loads every asset in one pack.
   *
   * @param packId Such as `biome.meadow`.
   * @param onProgress Called at the start and as each asset settles.
   */
  loadPack(packId: string, onProgress?: (progress: PackProgress) => void): Promise<LoadedPack> {
    const started = this.loads.get(packId);
    if (started) return started;
    const load = this.load(packId, onProgress);
    this.loads.set(packId, load);
    return load;
  }

  /** Fetches the pack's textures in parallel and sorts each asset into what happened to it. */
  private async load(
    packId: string,
    onProgress?: (progress: PackProgress) => void,
  ): Promise<LoadedPack> {
    const pack = this.packs.get(packId);
    if (!pack) throw new Error(`No asset pack "${packId}" in the manifest`);

    const textures = new Map<string, Texture>();
    const missing: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];
    const total = pack.assets.length;
    let settled = 0;
    onProgress?.({ packId, settled, total });

    await Promise.all(
      pack.assets.map(async (asset, index) => {
        const found = this.urlFor(asset.file);
        if (!asset.file.endsWith(".png")) skipped.push(asset.id);
        else if (!found) missing.push(asset.id);
        else {
          try {
            textures.set(asset.id, this.pixelCrisp(await this.fetchTexture(found.url)));
            if (found.authored) log(`${asset.id} authored`);
          } catch {
            failed.push(asset.id);
          }
        }
        if (this.delayMs > 0) {
          await new Promise((wait) => setTimeout(wait, this.delayMs * (index + 1)));
        }
        settled += 1;
        onProgress?.({ packId, settled, total });
      }),
    );

    return { id: packId, textures, missing, failed, skipped };
  }

  /**
   * The URL to fetch, preferring a hand-built file of the same name.
   *
   * @param file The path the manifest names, under `assets/generated/`.
   */
  private urlFor(file: string): { url: string; authored: boolean } | undefined {
    if (file.startsWith(generatedRoot)) {
      const authored = this.urls.get(authoredRoot + file.slice(generatedRoot.length));
      if (authored) return { url: authored, authored: true };
    }
    const generated = this.urls.get(file);
    return generated ? { url: generated, authored: false } : undefined;
  }

  /** No smoothing up close, and colors read as sRGB. */
  private pixelCrisp(texture: Texture): Texture {
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }
}
