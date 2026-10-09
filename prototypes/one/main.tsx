import { createRoot } from "react-dom/client";
import { loadBundle } from "../../src/content/load";
import { createSeededMeadow } from "../../src/sim/field/map";
import { SeededRandomGenerator } from "../../src/sim/utils/rng.controller";
import { Overlay } from "../../src/ui/Overlay";
import { TerrainTextureLoader } from "../../src/view/art/terrain-textures.controller";
import { CombatViewController } from "../../src/view/combat/view.controller";
import { FieldViewController } from "../../src/view/field/view.controller";
import { RenderLoopController } from "../../src/view/renderer.controller";
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
  // `?camera=overview` shows the whole meadow instead of following the hero.
  // `?combat=mob.slime,mob.ember_imp` opens on that pack's fight instead of the field.
  // `?combat` alone opens on the biome's miniboss.
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get("seed");
  const seed = seedParam === null ? Math.floor(Math.random() * 2 ** 32) : Number(seedParam) >>> 0;
  const cameraMode = params.get("camera") === "overview" ? "overview" : "follow";
  const combatParam = params.get("combat");

  const bundle = loadBundle(bundleSource);
  const biome = bundle.biomes[0];
  if (!biome) throw new Error("The bundle has no biome");

  const loop = new RenderLoopController(view);
  const backend = await loop.init();
  const textures = await new TerrainTextureLoader(bundle.assets, import.meta.env.BASE_URL).load();

  if (combatParam !== null) {
    const mobIds = combatParam === "" ? [biome.miniboss] : combatParam.split(",");
    const known = new Set(bundle.mobs.mobs.map((mob) => mob.id));
    const unknown = mobIds.filter((id) => !known.has(id));
    if (unknown.length > 0) throw new Error(`Unknown mob in ?combat: ${unknown.join(", ")}`);

    await new CombatViewController({ loop, mobIds, textures }).start();
    root.render(<Overlay status={`Renderer backend: ${backend} · combat`} />);
  } else {
    const map = createSeededMeadow({
      seed,
      width: biome.width,
      height: biome.height,
      minibossDistance: biome.minibossDistance,
    });
    await new FieldViewController({
      loop,
      map,
      textures,
      minibossId: biome.miniboss,
      seed,
      rng: new SeededRandomGenerator(seed),
      cameraMode,
    }).start();
    root.render(<Overlay status={`Renderer backend: ${backend} · seed ${seed}`} />);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown renderer error";
  root.render(<Overlay status={`Renderer failed: ${message}`} />);
}
