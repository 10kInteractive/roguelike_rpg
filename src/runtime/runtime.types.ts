import type { BundleSource } from "../content/load.types";
import type { FieldCameraMode } from "../view/field/view.types";

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
  /** `?webgl` draws with WebGL2 even when the browser has WebGPU. */
  forceWebGL: boolean;
};

/** What a page gives the runtime: where to draw, what content to run, and where to report. */
export type GameRuntimeInput = {
  /** The element the canvas fills. */
  view: HTMLElement;
  /** The prototype's content bundle files. */
  bundleSource: BundleSource;
  /** Called with a line of status for the overlay: starting, running, or failed. */
  onStatus: (status: string) => void;
};
