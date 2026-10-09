import { expect, test } from "vitest";
import assets from "../../prototypes/one/bundle/assets.json" with { type: "json" };
import biome from "../../prototypes/one/bundle/biome.meadow.json" with { type: "json" };
import manifest from "../../prototypes/one/bundle/bundle.json" with { type: "json" };
import encounters from "../../prototypes/one/bundle/encounters.json" with { type: "json" };
import hero from "../../prototypes/one/bundle/hero.json" with { type: "json" };
import items from "../../prototypes/one/bundle/items.json" with { type: "json" };
import mobs from "../../prototypes/one/bundle/mobs.json" with { type: "json" };
import rules from "../../prototypes/one/bundle/rules.json" with { type: "json" };
import spells from "../../prototypes/one/bundle/spells.json" with { type: "json" };
import { loadBundle } from "./load";

test("prototype one loads Strider, the spells, the potion, the mobs, and the meadow", () => {
  const bundle = loadBundle({
    manifest,
    rules,
    hero,
    spells,
    items,
    mobs,
    encounters,
    biomes: [biome],
    assets,
  });

  expect(bundle.hero).toMatchObject({
    name: "Strider",
    hp: 30,
    mp: 10,
    spells: ["spell.ember", "spell.frost"],
    items: [{ id: "item.potion", count: 3 }],
  });
  expect(bundle.spells.spells.map((spell) => spell.id)).toEqual(["spell.ember", "spell.frost"]);
  expect(bundle.items.items).toEqual([{ id: "item.potion", heal: 25 }]);
  expect(bundle.mobs.mobs.map((mob) => mob.id)).toEqual([
    "mob.slime",
    "mob.ember_imp",
    "mob.frost_moth",
    "mob.rust_sentinel",
  ]);
  expect(bundle.mobs.mobs[1]).toMatchObject({ weak: "ice", resists: "fire", xp: 5 });
  expect(bundle.mobs.mobs[3]).toMatchObject({ miniboss: true, xp: 40 });
  expect(bundle.biomes[0]).toMatchObject({
    id: "biome.meadow",
    width: 48,
    height: 48,
    miniboss: "mob.rust_sentinel",
    minibossDistance: 20,
  });
  expect(bundle.rules).toMatchObject({ levelCap: 10, xpPerLevel: 6, turnBase: 100 });
});
