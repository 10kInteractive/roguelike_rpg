import type { Bundle } from "./schema";

/** One mob as the bundle stores it. */
export type BundleMob = Bundle["mobs"]["mobs"][number];

/** One spell as the bundle stores it. */
export type BundleSpell = Bundle["spells"]["spells"][number];

/** The hero file from the bundle. */
export type BundleHero = Bundle["hero"];
