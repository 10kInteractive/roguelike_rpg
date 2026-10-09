import { expect, test } from "vitest";
import { BundleError, type BundleSource, loadBundle } from "./load";

function valid(): BundleSource {
  return {
    manifest: {
      id: "prototype.one",
      version: 1,
      extends: [],
      files: {
        rules: "rules.json",
        hero: "hero.json",
        spells: "spells.json",
        items: "items.json",
        mobs: "mobs.json",
        encounters: "encounters.json",
        biomes: ["biome.meadow.json"],
        assets: "assets.json",
      },
    },
    rules: {
      turnBase: 100,
      spreadMin: 0.9,
      spreadMax: 1.1,
      critChance: 0.05,
      critMultiplier: 1.5,
      weaknessMultiplier: 1.5,
      resistanceMultiplier: 0.5,
      defendMultiplier: 0.5,
      fleeBase: 0.5,
      fleePerPoint: 0.05,
      fleeMin: 0.1,
      fleeMax: 0.9,
      fieldTickRate: 30,
      heroWalkSpeed: 4,
      heroCollisionRadius: 0.3,
      minEncounterDistance: 4,
      levelCap: 10,
      xpPerLevel: 6,
    },
    hero: {
      id: "hero.strider",
      name: "Strider",
      hp: 30,
      mp: 10,
      str: 8,
      def: 4,
      mag: 6,
      haste: 8,
      growth: { hp: 6, mp: 2, str: 2, def: 1, mag: 1, haste: 1 },
      spells: ["spell.ember"],
      items: [{ id: "item.potion", count: 3 }],
    },
    spells: {
      spells: [{ id: "spell.ember", element: "fire", power: 8, cost: 3 }],
    },
    items: {
      items: [{ id: "item.potion", heal: 25 }],
    },
    mobs: {
      mobs: [
        {
          id: "mob.slime",
          hp: 12,
          str: 6,
          def: 2,
          mag: 0,
          haste: 5,
          xp: 3,
          actions: [{ type: "attack", weight: 1 }],
        },
      ],
    },
    encounters: {
      terrains: [
        {
          id: "terrain.grass",
          rate: 0.1,
          packs: [{ weight: 50, groups: [{ id: "mob.slime", min: 1, max: 2 }] }],
        },
      ],
    },
    biomes: [
      {
        id: "biome.meadow",
        width: 48,
        height: 48,
        miniboss: "mob.slime",
        minibossDistance: 20,
        minibossRadius: 0.8,
      },
    ],
    assets: {
      packs: [
        {
          id: "boot",
          load: "immediate",
          assets: [{ id: "ui.font.main", file: "font.png" }],
        },
      ],
    },
  };
}

test("a valid bundle loads", () => {
  const bundle = loadBundle(valid());
  expect(bundle.manifest.id).toBe("prototype.one");
  expect(bundle.hero.spells).toEqual(["spell.ember"]);
  expect(bundle.mobs.mobs[0]?.id).toBe("mob.slime");
});

test("an encounter that names a missing mob fails", () => {
  const source = valid();
  source.encounters = {
    terrains: [
      {
        id: "terrain.grass",
        rate: 0.1,
        packs: [{ weight: 50, groups: [{ id: "mob.ember_imp", min: 1, max: 1 }] }],
      },
    ],
  };
  expect(() => loadBundle(source)).toThrow(BundleError);
  expect(() => loadBundle(source)).toThrow('Unknown mob "mob.ember_imp" in encounters');
});
