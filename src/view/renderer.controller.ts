import { PerspectiveCamera, type Scene } from "three";
import { WebGPURenderer } from "three/webgpu";
import { debugLog } from "../debug/logger.controller";
import { debugWatches } from "../debug/watch.controller";
import type { RendererBackend } from "./renderer.types";

const log = debugLog.create("view");

/**
 * The canvas, the WebGPU renderer, and the camera, sized to their parent.
 *
 * One per page. It owns the only render loop: each display frame it calls
 * the frame callback with the seconds since the last frame, then draws.
 */
export class RenderLoopController {
  /** The camera every scene is drawn through. Scenes move it. */
  readonly camera = new PerspectiveCamera(50, 1, 0.1, 200);

  /** Draws into a canvas inside the parent. */
  private readonly renderer: WebGPURenderer;

  /** The element the canvas fills. */
  private readonly parent: HTMLElement;

  /** Display frames per second over the last half second. Dev panel only. */
  private fps = 0;

  /** @param parent The element the canvas fills. */
  constructor(parent: HTMLElement) {
    this.parent = parent;
    const canvas = document.createElement("canvas");
    parent.replaceChildren(canvas);
    const forceWebGL = new URLSearchParams(window.location.search).has("webgl");
    this.renderer = new WebGPURenderer({ canvas, antialias: true, forceWebGL });
  }

  /** Starts the GPU. Resolves with the backend three.js picked. */
  async init(): Promise<RendererBackend> {
    try {
      await this.renderer.init();
    } catch (error) {
      console.error("[view] renderer failed", error);
      throw error;
    }

    const backend = this.backend();
    log("renderer backend:", backend);
    if (import.meta.env.DEV) {
      debugWatches.watch("backend", () => backend);
      debugWatches.watch("fps", () => this.fps);
    }

    this.resize();
    new ResizeObserver(() => this.resize()).observe(this.parent);
    return backend;
  }

  /**
   * Draws `scene` every display frame.
   *
   * @param frame Runs before each draw with the seconds since the last frame. The first frame gets 0.
   */
  async run(scene: Scene, frame: (elapsedSeconds: number) => void): Promise<void> {
    let last: number | undefined;
    let frames = 0;
    let windowStart = performance.now();
    await this.renderer.setAnimationLoop((time) => {
      frame(last === undefined ? 0 : (time - last) / 1000);
      last = time;
      this.renderer.render(scene, this.camera);

      // Frames counted over half a second, for the dev panel.
      frames += 1;
      if (time - windowStart >= 500) {
        this.fps = Math.round((frames * 1000) / (time - windowStart));
        frames = 0;
        windowStart = time;
      }
    });
  }

  /** Matches the drawing buffer and the camera to the parent's size. */
  private resize(): void {
    const width = this.parent.clientWidth;
    const height = this.parent.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** WebGPU, or WebGL2 when the browser lacks WebGPU or `?webgl` forces it. */
  private backend(): RendererBackend {
    const backend = this.renderer.backend;
    if ("isWebGPUBackend" in backend && backend.isWebGPUBackend === true) {
      return "WebGPU";
    }
    return "WebGL2";
  }
}
