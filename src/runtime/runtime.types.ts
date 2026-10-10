import type { BundleSource } from "../content/load.types";
import type { FightTerrain } from "../view/combat/backdrops/backdrop.types";
import type { FieldCameraMode } from "../view/field/view.types";
import type { GameLoopMode } from "./game-loop.types";

export type { GameLoopMode };

/** How the page was asked to start, read from the URL. */
export type LaunchOptions = {
  /** Seed for the meadow and the fight rolls. `?seed=7`, or a fresh roll per load. */
  seed: number;
  /** `?camera=overview` shows the whole meadow. Otherwise the camera follows the hero. */
  camera: FieldCameraMode;
  /**
   * `?combat=mob.slime,mob.ember_imp` opens on that pack's fight instead of the field.
   * An empty list, from `?combat` alone, means the biome's miniboss. Null opens the field.
   */
  combat: readonly string[] | null;
  /** `?terrain=forest` with `?combat` opens the forest backdrop. Otherwise the meadow. */
  fightTerrain: FightTerrain;
  /** `?gameloop=ai` lets the stand-in walk and fight. Otherwise the player does. */
  gameloop: GameLoopMode;
  /** `?webgl` draws with WebGL2 even when the browser has WebGPU. */
  forceWebGL: boolean;
  /** `?assetDelay=150` slows each asset by that many milliseconds, so progress shows. Dev only. */
  assetDelayMs: number;
};

/** One line for the overlay, and how far a load has got when one is running. */
export type RuntimeStatus = {
  /** Such as `Loading biome.meadow… 4/10` or `Renderer backend: WebGPU · seed 42`. */
  text: string;
  /** From 0 to 1 while a pack loads. Absent otherwise. */
  progress?: number;
};

/** What a page gives the runtime: where to draw, what content to run, and where to report. */
export type GameRuntimeInput = {
  /** The element the canvas fills. */
  view: HTMLElement;
  /** The prototype's content bundle files. */
  bundleSource: BundleSource;
  /** Called with the overlay's status: starting, loading with progress, running, or failed. */
  onStatus: (status: RuntimeStatus) => void;
};
