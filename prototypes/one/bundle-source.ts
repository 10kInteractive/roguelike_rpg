import type { BundleSource } from "../../src/content/load.types";

/** Every JSON file in this prototype's bundle, keyed by file name. */
const files = Object.fromEntries(
  Object.entries(
    import.meta.glob<unknown>("./bundle/*.json", { eager: true, import: "default" }),
  ).map(([file, json]) => [file.replace("./bundle/", ""), json]),
);

/** Prototype one's bundle, gathered through `bundle.json`'s file list and not yet validated. */
export const bundleSource: BundleSource = gather();

/** Reads `bundle.json`, then each file it names. A missing file fails here. */
function gather(): BundleSource {
  const manifest = files["bundle.json"] as {
    files: {
      rules: string;
      hero: string;
      spells: string;
      items: string;
      mobs: string;
      encounters: string;
      biomes: string[];
      assets: string;
    };
  };
  const read = (file: string): unknown => {
    if (!(file in files)) throw new Error(`bundle.json names ${file}, which is not in the bundle`);
    return files[file];
  };
  const list = manifest.files;
  return {
    manifest,
    rules: read(list.rules),
    hero: read(list.hero),
    spells: read(list.spells),
    items: read(list.items),
    mobs: read(list.mobs),
    encounters: read(list.encounters),
    biomes: list.biomes.map(read),
    assets: read(list.assets),
  };
}
