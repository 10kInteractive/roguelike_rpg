import type * as z from "zod";
import type { BundleSource } from "./load.types";
import {
  assetsSchema,
  type Bundle,
  biomeSchema,
  encountersSchema,
  heroSchema,
  itemsSchema,
  manifestSchema,
  mobsSchema,
  rulesSchema,
  spellsSchema,
} from "./schema";

/** A bundle that fails validation. The message lists every problem found. */
export class BundleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BundleError";
  }
}

/**
 * Validates one bundle and resolves its references.
 *
 * A name that points at missing content fails. Duplicate ids fail too.
 */
export function loadBundle(source: BundleSource): Bundle {
  const manifest = parsePart(manifestSchema, source.manifest, "bundle.json");
  const rules = parsePart(rulesSchema, source.rules, "rules");
  const hero = parsePart(heroSchema, source.hero, "hero");
  const spells = parsePart(spellsSchema, source.spells, "spells");
  const items = parsePart(itemsSchema, source.items, "items");
  const mobs = parsePart(mobsSchema, source.mobs, "mobs");
  const encounters = parsePart(encountersSchema, source.encounters, "encounters");
  const assets = parsePart(assetsSchema, source.assets, "assets");
  const biomes = source.biomes.map((biome, index) =>
    parsePart(biomeSchema, biome, `biomes[${index}]`),
  );

  // Every id is unique, then every reference has to name one of them.
  const problems: string[] = [];
  const spellIds = indexIds(spells.spells, "spell", problems);
  const itemIds = indexIds(items.items, "item", problems);
  const mobIds = indexIds(mobs.mobs, "mob", problems);

  for (const spell of hero.spells) {
    if (!spellIds.has(spell)) problems.push(`Unknown spell "${spell}" in hero`);
  }
  for (const item of hero.items) {
    if (!itemIds.has(item.id)) problems.push(`Unknown item "${item.id}" in hero`);
  }
  for (const mob of mobs.mobs) {
    for (const action of mob.actions) {
      if (action.type === "spell" && !spellIds.has(action.spell)) {
        problems.push(`Unknown spell "${action.spell}" in ${mob.id}`);
      }
    }
  }
  for (const terrain of encounters.terrains) {
    for (const pack of terrain.packs) {
      for (const group of pack.groups) {
        if (!mobIds.has(group.id)) problems.push(`Unknown mob "${group.id}" in encounters`);
      }
    }
  }
  for (const biome of biomes) {
    if (!mobIds.has(biome.miniboss))
      problems.push(`Unknown mob "${biome.miniboss}" in ${biome.id}`);
    for (const id of biome.minibossFront) {
      if (!mobIds.has(id)) problems.push(`Unknown mob "${id}" in ${biome.id}`);
    }
  }
  for (const terrain of encounters.terrains) {
    for (const pack of terrain.packs) {
      for (const group of pack.groups) {
        if (group.max < group.min) {
          problems.push(`${group.id} in encounters has a max below its min`);
        }
      }
    }
  }

  if (problems.length > 0) throw new BundleError(problems.join("\n"));

  return { manifest, rules, hero, spells, items, mobs, encounters, biomes, assets };
}

function parsePart<T>(schema: z.ZodType<T>, value: unknown, file: string): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const issue = result.error.issues[0];
  const where = issue?.path.join(".") || "(root)";
  throw new BundleError(`${file}: ${where}: ${issue?.message ?? "invalid"}`);
}

function indexIds(entries: { id: string }[], kind: string, problems: string[]): Set<string> {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) problems.push(`Duplicate ${kind} "${entry.id}"`);
    ids.add(entry.id);
  }
  return ids;
}
