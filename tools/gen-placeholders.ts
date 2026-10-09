import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadBundle } from "../src/content/load.ts";
import { terrainRecipes, terrainTextureSize } from "./placeholders/terrain.constants.ts";
import { TerrainTexturePainter } from "./placeholders/terrain.controller.ts";
import type { Sidecar } from "./placeholders/terrain.types.ts";
import { readBundle } from "./read-bundle.ts";

// Writes the placeholder terrain textures named in prototype one's asset manifest.
// Each PNG gets a `.json` sidecar. A file whose pixels did not change is left alone.

const bundleDir = "prototypes/one/bundle";
const generator = "tools/gen-placeholders.ts";

const bundle = loadBundle(await readBundle(bundleDir));
const files = new Map(
  bundle.assets.packs.flatMap((pack) => pack.assets.map((a) => [a.id, a.file])),
);

for (const recipe of terrainRecipes) {
  const file = files.get(recipe.id);
  if (!file) throw new Error(`${recipe.id} is not in ${bundleDir}/assets.json`);

  const png = new TerrainTexturePainter(recipe, terrainTextureSize).paint().toPng();
  const sidecarFile = `${file}.json`;
  if (await sameBytes(file, png)) {
    console.log(`unchanged ${file}`);
    continue;
  }

  const sidecar: Sidecar = {
    id: recipe.id,
    generator,
    seed: recipe.seed,
    size: terrainTextureSize,
    recipe,
    generatedAt: new Date().toISOString(),
  };
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, png);
  await writeFile(sidecarFile, `${JSON.stringify(sidecar, null, 2)}\n`);
  console.log(`wrote ${file} (${png.length} bytes) and ${path.basename(sidecarFile)}`);
}

/** True when the file exists and holds exactly these bytes. */
async function sameBytes(file: string, bytes: Uint8Array): Promise<boolean> {
  try {
    return Buffer.compare(await readFile(file), bytes) === 0;
  } catch {
    return false;
  }
}
