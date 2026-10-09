import { NearestFilter, Texture } from "three";
import { expect, test } from "vitest";
import { AssetLoaderController } from "./loader.controller";
import type { PackProgress } from "./loader.types";

const manifest = {
  packs: [
    {
      id: "biome.test",
      load: "lazy" as const,
      assets: [
        { id: "terrain.grass.texture", file: "assets/generated/grass.png" },
        { id: "terrain.water.texture", file: "assets/generated/water.png" },
        { id: "terrain.lava.texture", file: "assets/generated/lava.png" },
        { id: "mob.slime.model", file: "assets/generated/slime.glb" },
      ],
    },
  ],
};

const urls = new Map([
  ["assets/generated/grass.png", "/built/grass.123.png"],
  ["assets/generated/water.png", "/built/water.456.png"],
]);

test("sorts a pack into loaded, missing, failed, and skipped, reporting each step", async () => {
  const fetched: string[] = [];
  const loader = new AssetLoaderController({
    manifest,
    urls,
    fetchTexture: async (url) => {
      fetched.push(url);
      if (url.includes("water")) throw new Error("decode failed");
      return new Texture();
    },
  });
  const progress: PackProgress[] = [];
  const pack = await loader.loadPack("biome.test", (step) => progress.push(step));

  expect([...pack.textures.keys()]).toEqual(["terrain.grass.texture"]);
  expect(pack.failed).toEqual(["terrain.water.texture"]);
  expect(pack.missing).toEqual(["terrain.lava.texture"]);
  expect(pack.skipped).toEqual(["mob.slime.model"]);
  expect(fetched.sort()).toEqual(["/built/grass.123.png", "/built/water.456.png"]);
  expect(progress.map((step) => step.settled)).toEqual([0, 1, 2, 3, 4]);
  expect(progress.every((step) => step.total === 4 && step.packId === "biome.test")).toBe(true);
});

test("textures come out pixel-crisp", async () => {
  const loader = new AssetLoaderController({
    manifest,
    urls,
    fetchTexture: async () => new Texture(),
  });
  const pack = await loader.loadPack("biome.test");
  const grass = pack.textures.get("terrain.grass.texture");
  expect(grass?.magFilter).toBe(NearestFilter);
  expect(grass?.minFilter).toBe(NearestFilter);
});

test("a second ask shares the first load instead of fetching again", async () => {
  let fetches = 0;
  const loader = new AssetLoaderController({
    manifest,
    urls,
    fetchTexture: async () => {
      fetches += 1;
      return new Texture();
    },
  });
  const [first, second] = await Promise.all([
    loader.loadPack("biome.test"),
    loader.loadPack("biome.test"),
  ]);
  expect(second).toBe(first);
  expect(fetches).toBe(2);
});

test("an unknown pack is an error", async () => {
  const loader = new AssetLoaderController({ manifest, urls });
  await expect(loader.loadPack("biome.nowhere")).rejects.toThrow('No asset pack "biome.nowhere"');
});
