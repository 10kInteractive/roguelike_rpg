/** One bundle's files, parsed as JSON but not yet validated. */
export type BundleSource = {
  /** `bundle.json`. */
  manifest: unknown;
  /** `rules.json`. */
  rules: unknown;
  /** `hero.json`. */
  hero: unknown;
  /** `spells.json`. */
  spells: unknown;
  /** `items.json`. */
  items: unknown;
  /** `mobs.json`. */
  mobs: unknown;
  /** `encounters.json`. */
  encounters: unknown;
  /** One entry per biome file. */
  biomes: unknown[];
  /** `assets.json`. */
  assets: unknown;
};
