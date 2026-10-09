import { BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene } from "three";
import { WebGPURenderer } from "three/webgpu";
import { debugLog } from "../debug/logger.controller";
import { debugWatches } from "../debug/watch.controller";
import { moveHeroAlongStick } from "../sim/field/movement";
import { tickRate } from "../sim/field/movement.constants";
import type { Position } from "../sim/field/movement.types";
import { FixedStepClock } from "./fixed-step.controller";
import { PositionInterpolator } from "./interpolation.controller";
import { squareSideTicks, squareWalk } from "./renderer.constants";

const log = debugLog.create("view");
const loopLog = debugLog.create("view:loop");

export type RendererBackend = "WebGPU" | "WebGL2";

function backendOf(renderer: WebGPURenderer): RendererBackend {
  const backend = renderer.backend;
  if ("isWebGPUBackend" in backend && backend.isWebGPUBackend === true) {
    return "WebGPU";
  }
  return "WebGL2";
}

export async function mountRenderer(parent: HTMLElement): Promise<RendererBackend> {
  const canvas = document.createElement("canvas");
  parent.replaceChildren(canvas);

  const params = new URLSearchParams(window.location.search);
  const forceWebGL = params.has("webgl");
  const interpolate = params.get("interp") !== "off";
  const renderer = new WebGPURenderer({ canvas, antialias: true, forceWebGL });
  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 0.1, 10);
  camera.position.z = 2.5;

  const mesh = new Mesh(new BoxGeometry(0.4, 0.4, 0.4), new MeshBasicMaterial({ color: 0xc4a35a }));
  scene.add(mesh);

  try {
    await renderer.init();
  } catch (error) {
    console.error("[view] renderer failed", error);
    throw error;
  }

  const backend = backendOf(renderer);
  log("renderer backend:", backend);

  // The stand-in hero: the sim's movement at its own 30 Hz, drawn between steps.
  const clock = new FixedStepClock(tickRate);
  let hero: Position = { x: -0.5, y: -0.5 };
  const motion = new PositionInterpolator(hero);
  let simTick = 0;
  loopLog(`fixed step at ${tickRate} Hz, interpolation ${interpolate ? "on" : "off"}`);

  let frames = 0;
  let fpsWindowStart = performance.now();
  let fps = 0;
  let ticksAtWindowStart = 0;
  let simHz = 0;
  let lastFrame: number | undefined;
  let drawn = hero;
  if (import.meta.env.DEV) {
    debugWatches.watch("backend", () => backend);
    debugWatches.watch("fps", () => fps);
    debugWatches.watch("sim tick", () => simTick);
    debugWatches.watch("sim Hz", () => simHz);
    debugWatches.watch("blend", () => (interpolate ? clock.blend.toFixed(2) : "off"));
    debugWatches.watch("hero", () => `${drawn.x.toFixed(2)}, ${drawn.y.toFixed(2)}`);
  }

  const resize = () => {
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(parent);

  renderer.setClearColor(0x1d3a2a);
  await renderer.setAnimationLoop((time) => {
    // Bank this frame, then run every sim step that is due.
    const steps = clock.advance(lastFrame === undefined ? 0 : (time - lastFrame) / 1000);
    lastFrame = time;
    for (let i = 0; i < steps; i++) {
      const side = Math.floor(simTick / squareSideTicks) % squareWalk.length;
      const stick = squareWalk[side] ?? { x: 0, y: 0 };
      hero = moveHeroAlongStick(hero, stick, 1);
      motion.push(hero);
      simTick += 1;
    }

    // Sim north is +y. Three.js draws it up the screen for this flat placeholder.
    drawn = interpolate ? motion.at(clock.blend) : motion.latest();
    mesh.position.set(drawn.x, drawn.y, 0);
    mesh.rotation.y = time * 0.001;
    renderer.render(scene, camera);

    if (import.meta.env.DEV) {
      frames += 1;
      if (time - fpsWindowStart >= 500) {
        const seconds = (time - fpsWindowStart) / 1000;
        fps = Math.round(frames / seconds);
        simHz = Math.round((simTick - ticksAtWindowStart) / seconds);
        frames = 0;
        ticksAtWindowStart = simTick;
        fpsWindowStart = time;
      }
    }
  });

  return backend;
}
