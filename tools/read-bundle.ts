import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BundleSource } from "../src/content/load.ts";

export async function readBundle(dir: string): Promise<BundleSource> {
  const manifest = await readJson(path.join(dir, "bundle.json"));
  const files = fileList(manifest, dir);
  const read = (file: string) => readJson(path.join(dir, file));
  const biomes = [];
  for (const file of files.biomes) biomes.push(await read(file));

  return {
    manifest,
    rules: await read(files.rules),
    hero: await read(files.hero),
    spells: await read(files.spells),
    items: await read(files.items),
    mobs: await read(files.mobs),
    encounters: await read(files.encounters),
    biomes,
    assets: await read(files.assets),
  };
}

function fileList(manifest: unknown, dir: string) {
  if (typeof manifest !== "object" || manifest === null || !("files" in manifest)) {
    throw new Error(`${dir}: bundle.json is missing its file list`);
  }
  const files = manifest.files;
  if (typeof files !== "object" || files === null) {
    throw new Error(`${dir}: bundle.json is missing its file list`);
  }
  const record = files as Record<string, unknown>;
  const biomes = record.biomes;
  if (!Array.isArray(biomes) || !biomes.every((file) => typeof file === "string")) {
    throw new Error(`${dir}: bundle.json biomes must be a list of files`);
  }
  return {
    rules: fileName(record.rules, dir, "rules"),
    hero: fileName(record.hero, dir, "hero"),
    spells: fileName(record.spells, dir, "spells"),
    items: fileName(record.items, dir, "items"),
    mobs: fileName(record.mobs, dir, "mobs"),
    encounters: fileName(record.encounters, dir, "encounters"),
    assets: fileName(record.assets, dir, "assets"),
    biomes,
  };
}

function fileName(value: unknown, dir: string, key: string): string {
  if (typeof value !== "string") {
    throw new Error(`${dir}: bundle.json files.${key} must be a file name`);
  }
  return value;
}

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8")) as unknown;
}
