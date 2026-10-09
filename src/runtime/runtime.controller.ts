import type { Texture } from "three";
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
import { createSeededMeadow } from "../sim/field/map";
import type { Terrain } from "../sim/field/map.types";
import { SeededRandomGenerator } from "../sim/utils/rng.controller";
import { TerrainTextureLoader } from "../view/art/terrain-textures.controller";
import { CombatViewController } from "../view/combat/view.controller";
import { FieldViewController } from "../view/field/view.controller";
import { RenderLoopController } from "../view/renderer.controller";
import type { GameRuntimeInput, LaunchOptions } from "./runtime.types";

const log = debugLog.create("runtime");

/**
 * Starts the game on a page: reads the launch options, loads the bundle,
 * starts the renderer and the textures, then opens the field or a fight.
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
    this.input.onStatus("Starting renderer…");
    try {
      const options = this.readOptions(new URLSearchParams(window.location.search));
      const bundle = loadBundle(this.input.bundleSource);
      const biome = bundle.biomes[0];
      if (!biome) throw new Error("The bundle has no biome");

      const loop = new RenderLoopController(this.input.view, options.forceWebGL);
      const backend = await loop.init();
      const textures = await new TerrainTextureLoader(
        bundle.assets,
        import.meta.env.BASE_URL,
      ).load();

      if (options.combat) {
        await this.startCombat({ loop, bundle, biome, textures, options, mobIds: options.combat });
        this.input.onStatus(`Renderer backend: ${backend} · combat · seed ${options.seed}`);
      } else {
        await this.startField({ loop, bundle, biome, textures, options });
        this.input.onStatus(`Renderer backend: ${backend} · seed ${options.seed}`);
      }
    } catch (error) {
      console.error("[runtime] start failed", error);
      const message = error instanceof Error ? error.message : "Unknown renderer error";
      this.input.onStatus(`Renderer failed: ${message}`);
    }
  }

  /** The seeded meadow, with the stand-in walk. */
  private async startField(input: {
    loop: RenderLoopController;
    bundle: Bundle;
    biome: Bundle["biomes"][number];
    textures: Partial<Record<Terrain, Texture>>;
    options: LaunchOptions;
  }): Promise<void> {
    const { loop, biome, textures, options } = input;
    const map = createSeededMeadow({
      seed: options.seed,
      width: biome.width,
      height: biome.height,
      minibossDistance: biome.minibossDistance,
    });
    log(`field, seed ${options.seed}`);
    await new FieldViewController({
      loop,
      map,
      textures,
      minibossId: biome.miniboss,
      seed: options.seed,
      rng: new SeededRandomGenerator(options.seed),
      cameraMode: options.camera,
    }).start();
  }

  /** One pack's fight, played by the stand-in caster. */
  private async startCombat(input: {
    loop: RenderLoopController;
    bundle: Bundle;
    biome: Bundle["biomes"][number];
    textures: Partial<Record<Terrain, Texture>>;
    options: LaunchOptions;
    mobIds: readonly string[];
  }): Promise<void> {
    const { loop, bundle, biome, textures, options } = input;
    const mobIds = input.mobIds.length === 0 ? [biome.miniboss] : input.mobIds;
    const known = new Set(bundle.mobs.mobs.map((mob) => mob.id));
    const unknown = mobIds.filter((id) => !known.has(id));
    if (unknown.length > 0) throw new Error(`Unknown mob in ?combat: ${unknown.join(", ")}`);

    log(`combat: ${mobIds.join(", ")}, seed ${options.seed}`);
    await new CombatViewController({
      loop,
      mobIds,
      textures,
      hero: heroFighterFromBundle(bundle.hero),
      mobs: runMobsFromBundle(bundle),
      combat: combatRulesFromBundle(bundle),
      leveling: levelRulesFromBundle(bundle),
      spells: knownSpellsFromBundle(bundle),
      seed: options.seed,
    }).start();
  }

  /** The launch options in the URL. A missing seed rolls a fresh one. */
  private readOptions(params: URLSearchParams): LaunchOptions {
    const seed = params.get("seed");
    const combat = params.get("combat");
    return {
      seed: seed === null ? Math.floor(Math.random() * 2 ** 32) : Number(seed) >>> 0,
      camera: params.get("camera") === "overview" ? "overview" : "follow",
      combat: combat === null ? null : combat.split(",").filter((id) => id !== ""),
      forceWebGL: params.has("webgl"),
    };
  }
}
