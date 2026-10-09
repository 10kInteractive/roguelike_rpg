import { createRoot } from "react-dom/client";
import { loadBundle } from "../../src/content/load";
import { createSeededMeadow } from "../../src/sim/field/map";
import { SeededRandomGenerator } from "../../src/sim/utils/rng.controller";
import { Overlay } from "../../src/ui/Overlay";
import { FieldViewController } from "../../src/view/field-view.controller";
import { RenderLoopController } from "../../src/view/renderer.controller";
import { TerrainTextureLoader } from "../../src/view/terrain-textures.controller";
import { bundleSource } from "./bundle-source";

const view = document.getElementById("view");
const overlay = document.getElementById("overlay");

if (!view || !overlay) {
  throw new Error("Missing #view or #overlay element");
}

if (import.meta.env.DEV) {
  const { mountDevPanel } = await import("../../src/debug/panel");
  mountDevPanel();
}

const root = createRoot(overlay);
root.render(<Overlay status="Starting renderer…" />);

try {
  // `?seed=7` replays a meadow. Without it, every page load rolls a new one.
  const seedParam = new URLSearchParams(window.location.search).get("seed");
  const seed = seedParam === null ? Math.floor(Math.random() * 2 ** 32) : Number(seedParam) >>> 0;

  const bundle = loadBundle(bundleSource);
  const biome = bundle.biomes[0];
  if (!biome) throw new Error("The bundle has no biome");
  const map = createSeededMeadow({
    seed,
    width: biome.width,
    height: biome.height,
    minibossDistance: biome.minibossDistance,
  });

  const loop = new RenderLoopController(view);
  const backend = await loop.init();
  const textures = await new TerrainTextureLoader(bundle.assets, import.meta.env.BASE_URL).load();
  const field = new FieldViewController({
    loop,
    map,
    textures,
    seed,
    rng: new SeededRandomGenerator(seed),
  });
  await field.start();
  root.render(<Overlay status={`Renderer backend: ${backend} · seed ${seed}`} />);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown renderer error";
  root.render(<Overlay status={`Renderer failed: ${message}`} />);
}
