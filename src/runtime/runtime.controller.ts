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
import type { Snapshot } from "../sim/game.types";
import { PackFightController } from "../sim/run/pack.controller";
import type { PackResult } from "../sim/run/pack.types";
import type { HeroState } from "../sim/run/run.types";
import { RunStatistics } from "../sim/run/stats.controller";
import type { RunStats } from "../sim/run/stats.types";
import { SeededRandomGenerator } from "../sim/utils/rng.controller";
import { pause } from "../ui/components/pause/controller";
import { uiStore } from "../ui/store.controller";
import { terrainTextureIds } from "../view/art/terrain-textures.constants";
import type { BackdropTextures, FightTerrain } from "../view/combat/backdrops/backdrop.types";
import {
  forestFloorTextureId,
  forestWallTextureId,
} from "../view/combat/backdrops/forest.constants";
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
      const textures = this.sceneTextures(pack);

      if (options.combat) {
        let seed = options.seed;
        for (;;) {
          const status = `Renderer backend: ${backend} · combat · seed ${seed}`;
          this.input.onStatus({ text: status });
          uiStore.beginFight();
          const result = await this.startCombat({
            loop,
            bundle,
            biome,
            textures,
            seed,
            mobIds: options.combat,
            terrain: options.fightTerrain,
          });
          if (result === "restart") {
            seed = Math.floor(Math.random() * 2 ** 32);
            continue;
          }
          this.input.onStatus({ text: `${status} · pack ${result.outcome}` });
          await uiStore.requestRestart();
          seed = Math.floor(Math.random() * 2 ** 32);
        }
      } else {
        const who = options.gameloop === "ai" ? "ai" : "you";
        let seed = options.seed;
        for (;;) {
          const status = `Renderer backend: ${backend} · seed ${seed} · ${who}`;
          this.input.onStatus({ text: status });
          const end = await this.startField({ loop, bundle, textures, options, seed });
          if (end.outcome === "restart") {
            seed = Math.floor(Math.random() * 2 ** 32);
            continue;
          }
          this.input.onStatus({ text: `${status} · ${this.describeEnd(end)}` });
          await uiStore.requestRestart();
          seed = Math.floor(Math.random() * 2 ** 32);
        }
      }
    } catch (error) {
      console.error("[runtime] start failed", error);
      const message = error instanceof Error ? error.message : "Unknown renderer error";
      this.input.onStatus({ text: `Renderer failed: ${message}` });
    }
  }

  /**
   * Each terrain's texture from the loaded pack, plus the forest fight's floor and trees.
   * A terrain without one draws its fallback color.
   * A file that failed is a real problem and warns. Missing and skipped files are placeholders not made yet.
   */
  private sceneTextures(pack: LoadedPack): BackdropTextures {
    if (pack.failed.length > 0) console.warn(`[runtime] ${pack.id} failed:`, pack.failed);
    log(`${pack.id}: ${pack.textures.size} loaded`, {
      missing: pack.missing,
      skipped: pack.skipped,
    });
    const textures: BackdropTextures = {};
    for (const [terrain, id] of Object.entries(terrainTextureIds) as [Terrain, string][]) {
      const texture = pack.textures.get(id);
      if (texture) textures[terrain] = texture;
    }
    const forestFloor = pack.textures.get(forestFloorTextureId);
    if (forestFloor) textures.forestFloor = forestFloor;
    const forestWall = pack.textures.get(forestWallTextureId);
    if (forestWall) textures.forestWall = forestWall;
    return textures;
  }

  /** The seeded meadow, played until the run ends. */
  private async startField(input: {
    loop: RenderLoopController;
    bundle: Bundle;
    textures: BackdropTextures;
    options: LaunchOptions;
    seed: number;
  }): Promise<RunEnd> {
    const { loop, bundle, textures, options, seed } = input;
    log(`field, seed ${seed}`);
    const end = await new GameLoopController({
      loop,
      bundle,
      textures,
      seed,
      cameraMode: options.camera,
      gameloop: options.gameloop,
    }).play();
    log("run over", end);
    return end;
  }

  /** The status line beside the ending screen: level, fights, and what killed you. */
  private describeEnd(end: RunEnd): string {
    const fights = end.fights === 1 ? "1 fight" : `${end.fights} fights`;
    if (end.outcome === "win") return `run won at level ${end.level} after ${fights}`;
    return `defeated by ${end.killedBy ?? "nobody"} at level ${end.level} after ${fights}`;
  }

  /** One pack's fight, played by the stand-in caster, then the ending screen. */
  private async startCombat(input: {
    loop: RenderLoopController;
    bundle: Bundle;
    biome: Bundle["biomes"][number];
    textures: BackdropTextures;
    seed: number;
    mobIds: readonly string[];
    terrain: FightTerrain;
  }): Promise<PackResult | "restart"> {
    const { loop, bundle, biome, textures, seed, terrain } = input;
    const mobIds = input.mobIds.length === 0 ? [biome.miniboss] : input.mobIds;
    const known = new Set(bundle.mobs.mobs.map((mob) => mob.id));
    const unknown = mobIds.filter((id) => !known.has(id));
    if (unknown.length > 0) throw new Error(`Unknown mob in ?combat: ${unknown.join(", ")}`);

    log(`combat ${terrain}: ${mobIds.join(", ")}, seed ${seed}`);
    const mobs = runMobsFromBundle(bundle);
    const hero = heroFighterFromBundle(bundle.hero);
    const choice = new SeededRandomGenerator(seed);
    const policy = new CombatActionPolicy(knownSpellsFromBundle(bundle), choice);
    const packs = new PackFightController({
      hero,
      mobs,
      combat: combatRulesFromBundle(bundle),
      leveling: levelRulesFromBundle(bundle),
      heroPolicy: (fighter, target) => policy.chooseCaster(fighter, target),
      rngs: {
        drops: new SeededRandomGenerator(seed),
        choice,
        combat: new SeededRandomGenerator(seed),
      },
    });
    const miniboss = mobIds.some((id) => mobs.get(id)?.fighter.miniboss);
    const result = packs.fight(
      mobIds.map((id) => ({ id, count: 1 })),
      miniboss,
    );
    const played = await pause.race(
      new CombatViewController({ loop, mobIds, textures, terrain, heroId: hero.id }).play(result),
    );
    if (played === null) return "restart";
    const lost = result.outcome === "lose";
    uiStore.present(
      this.scoreSnapshot(
        lost ? "gameOver" : "victory",
        this.score(seed, hero, result),
        packs.hero(),
      ),
    );
    log(`pack ${result.outcome}`, packs.hero());
    return result;
  }

  /** The pack's fights, counted the same way a run counts them. */
  private score(seed: number, hero: { id: string; level?: number }, result: PackResult): RunStats {
    const stats = new RunStatistics(seed, hero.level ?? 1, hero.id);
    for (const fight of result.fights) stats.addFight(fight.events, fight.mobId);
    return stats.snapshot();
  }

  /**
   * A snapshot the ending screen can read.
   * This launcher never walks a meadow, so the field is one grass tile.
   */
  private scoreSnapshot(mode: "victory" | "gameOver", stats: RunStats, hero: HeroState): Snapshot {
    const tile = { x: 0, y: 0 };
    return {
      mode,
      hero,
      field: {
        map: { width: 1, height: 1, tiles: ["grass"], spawn: tile, miniboss: tile },
        position: { x: 0.5, y: 0.5 },
        facing: { x: 0, y: -64 },
        miniboss: { tile, radius: 0.8, id: stats.killedBy ?? "mob.rust_sentinel" },
      },
      stats,
    };
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
      fightTerrain: params.get("terrain") === "forest" ? "forest" : "grass",
      forceWebGL: params.has("webgl"),
      assetDelayMs: import.meta.env.DEV ? Number(params.get("assetDelay") ?? 0) || 0 : 0,
    };
  }
}
