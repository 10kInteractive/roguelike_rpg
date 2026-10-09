import type { Texture } from "three";
import { AssetLoaderController } from "../assets/loader.controller";
import type { LoadedPack } from "../assets/loader.types";
import { bundledAssetUrls } from "../assets/urls.constants";
import { heroFighterFromBundle } from "../content/fighters";
import { loadBundle } from "../content/load";
import {
  combatRulesFromBundle,
  knownSpellsFromBundle,
  levelRulesFromBundle,
  runMobsFromBundle,
} from "../content/rules";
import type { Bundle } from "../content/schema";
import { debugLog } from "../debug/logger.controller";
import { CombatActionPolicy } from "../sim/combat/policy.controller";
import type { Terrain } from "../sim/field/map.types";
import { PackFightController } from "../sim/run/pack.controller";
import type { PackResult } from "../sim/run/pack.types";
import { SeededRandomGenerator } from "../sim/utils/rng.controller";
import { terrainTextureIds } from "../view/art/terrain-textures.constants";
import { CombatViewController } from "../view/combat/view.controller";
import { RenderLoopController } from "../view/renderer.controller";
import { GameLoopController } from "./game-loop.controller";
import type { RunEnd } from "./game-loop.types";
import type { GameRuntimeInput, LaunchOptions } from "./runtime.types";

const log = debugLog.create("runtime");

/**
 * Starts the game on a page: reads the launch options, loads the bundle,
 * starts the renderer, loads the biome's asset pack with progress, then
 * opens the field or a fight.
 *
 * One per page. The page only says where to draw, which bundle to run, and
 * where status goes. Everything about the content is decided here.
 */
export class GameRuntimeController {
  /** Where to draw, what content to run, and where to report. */
  private readonly input: GameRuntimeInput;

  /** @param input Where to draw, what content to run, and where to report. */
  constructor(input: GameRuntimeInput) {
    this.input = input;
  }

  /** Runs until the page closes. A failure is reported through `onStatus`, not thrown. */
  async start(): Promise<void> {
    this.input.onStatus({ text: "Starting renderer…" });
    try {
      const options = this.readOptions(new URLSearchParams(window.location.search));
      const bundle = loadBundle(this.input.bundleSource);
      const biome = bundle.biomes[0];
      if (!biome) throw new Error("The bundle has no biome");

      const loop = new RenderLoopController(this.input.view, options.forceWebGL);
      const backend = await loop.init();
      // The biome's pack shares its id, and loads only now that the biome is needed.
      const assets = new AssetLoaderController({
        manifest: bundle.assets,
        urls: bundledAssetUrls,
        delayMs: options.assetDelayMs,
      });
      const pack = await assets.loadPack(biome.id, ({ packId, settled, total }) => {
        this.input.onStatus({
          text: `Loading ${packId}… ${settled}/${total}`,
          progress: settled / total,
        });
      });
      const textures = this.terrainTextures(pack);

      if (options.combat) {
        const status = `Renderer backend: ${backend} · combat · seed ${options.seed}`;
        this.input.onStatus({ text: status });
        const result = await this.startCombat({
          loop,
          bundle,
          biome,
          textures,
          options,
          mobIds: options.combat,
        });
        this.input.onStatus({ text: `${status} · pack ${result.outcome}` });
      } else {
        const who = options.gameloop === "ai" ? "ai" : "you";
        const status = `Renderer backend: ${backend} · seed ${options.seed} · ${who}`;
        this.input.onStatus({ text: status });
        const end = await this.startField({ loop, bundle, textures, options });
        this.input.onStatus({ text: `${status} · ${this.describeEnd(end)}` });
      }
    } catch (error) {
      console.error("[runtime] start failed", error);
      const message = error instanceof Error ? error.message : "Unknown renderer error";
      this.input.onStatus({ text: `Renderer failed: ${message}` });
    }
  }

  /**
   * Each terrain's texture from the loaded pack. A terrain without one draws its fallback color.
   * A file that failed is a real problem and warns. Missing and skipped files are placeholders not made yet.
   */
  private terrainTextures(pack: LoadedPack): Partial<Record<Terrain, Texture>> {
    if (pack.failed.length > 0) console.warn(`[runtime] ${pack.id} failed:`, pack.failed);
    log(`${pack.id}: ${pack.textures.size} loaded`, {
      missing: pack.missing,
      skipped: pack.skipped,
    });
    const textures: Partial<Record<Terrain, Texture>> = {};
    for (const [terrain, id] of Object.entries(terrainTextureIds) as [Terrain, string][]) {
      const texture = pack.textures.get(id);
      if (texture) textures[terrain] = texture;
    }
    return textures;
  }

  /** The seeded meadow, played by the stand-in until the run ends. */
  private async startField(input: {
    loop: RenderLoopController;
    bundle: Bundle;
    textures: Partial<Record<Terrain, Texture>>;
    options: LaunchOptions;
  }): Promise<RunEnd> {
    const { loop, bundle, textures, options } = input;
    log(`field, seed ${options.seed}`);
    const end = await new GameLoopController({
      loop,
      bundle,
      textures,
      seed: options.seed,
      cameraMode: options.camera,
      gameloop: options.gameloop,
    }).play();
    log("run over", end);
    return end;
  }

  /** The status line's ending, until the game over screen exists. */
  private describeEnd(end: RunEnd): string {
    const fights = end.fights === 1 ? "1 fight" : `${end.fights} fights`;
    if (end.outcome === "win") return `run won at level ${end.level} after ${fights}`;
    return `defeated by ${end.killedBy ?? "nobody"} at level ${end.level} after ${fights}`;
  }

  /** One pack's fight, played by the stand-in caster. */
  private async startCombat(input: {
    loop: RenderLoopController;
    bundle: Bundle;
    biome: Bundle["biomes"][number];
    textures: Partial<Record<Terrain, Texture>>;
    options: LaunchOptions;
    mobIds: readonly string[];
  }): Promise<PackResult> {
    const { loop, bundle, biome, textures, options } = input;
    const mobIds = input.mobIds.length === 0 ? [biome.miniboss] : input.mobIds;
    const known = new Set(bundle.mobs.mobs.map((mob) => mob.id));
    const unknown = mobIds.filter((id) => !known.has(id));
    if (unknown.length > 0) throw new Error(`Unknown mob in ?combat: ${unknown.join(", ")}`);

    log(`combat: ${mobIds.join(", ")}, seed ${options.seed}`);
    const mobs = runMobsFromBundle(bundle);
    const hero = heroFighterFromBundle(bundle.hero);
    const choice = new SeededRandomGenerator(options.seed);
    const policy = new CombatActionPolicy(knownSpellsFromBundle(bundle), choice);
    const packs = new PackFightController({
      hero,
      mobs,
      combat: combatRulesFromBundle(bundle),
      leveling: levelRulesFromBundle(bundle),
      heroPolicy: (fighter, target) => policy.chooseCaster(fighter, target),
      rngs: {
        drops: new SeededRandomGenerator(options.seed),
        choice,
        combat: new SeededRandomGenerator(options.seed),
      },
    });
    const miniboss = mobIds.some((id) => mobs.get(id)?.fighter.miniboss);
    const result = packs.fight(
      mobIds.map((id) => ({ id, count: 1 })),
      miniboss,
    );
    await new CombatViewController({ loop, mobIds, textures, heroId: hero.id }).play(result);
    log(`pack ${result.outcome}`, packs.hero());
    return result;
  }

  /** The launch options in the URL. A missing seed rolls a fresh one. */
  private readOptions(params: URLSearchParams): LaunchOptions {
    const seed = params.get("seed");
    const combat = params.get("combat");
    return {
      seed: seed === null ? Math.floor(Math.random() * 2 ** 32) : Number(seed) >>> 0,
      camera: params.get("camera") === "overview" ? "overview" : "follow",
      gameloop: params.get("gameloop") === "ai" ? "ai" : "human",
      combat: combat === null ? null : combat.split(",").filter((id) => id !== ""),
      forceWebGL: params.has("webgl"),
      assetDelayMs: import.meta.env.DEV ? Number(params.get("assetDelay") ?? 0) || 0 : 0,
    };
  }
}
