import type { TilePoint } from "./map";

/** One mob in an encounter table, and how many of them may appear. */
export type EncounterGroup = {
  /** Mob id, such as `mob.slime`. */
  id: string;
  /** Fewest of this mob. */
  min: number;
  /** Most of this mob. */
  max: number;
};

/** One weighted bundle of groups. A roll on a boundary belongs to the next pack. */
export type EncounterPack = {
  /** This pack's share of the pick. */
  weight: number;
  /** Mobs that show up together. */
  groups: readonly EncounterGroup[];
};

/** How often a terrain starts a fight, and which packs it can roll. */
export type TerrainTable = {
  /** Chance per full tile walked. A roll equal to this does not start a fight. */
  rate: number;
  /** Packs this terrain can roll. */
  packs: readonly EncounterPack[];
};

/** Encounter tables for the walkable terrains. A missing terrain never rolls. */
export type EncounterTables = Partial<Record<"grass" | "forest" | "path", TerrainTable>>;

/** Distance walked since the last fight, split by the terrain under the hero. */
export type EncounterState = {
  /** Partial tile of grass walked toward the next roll. */
  grass: number;
  /** Partial tile of forest walked toward the next roll. */
  forest: number;
  /** Partial tile of path walked toward the next roll. */
  path: number;
  /** Tiles walked since the last fight. The gap after a fight does not roll. */
  distanceSinceFight: number;
};

/** How many of one mob joined the fight that just started. */
export type EncounterSpawn = {
  /** Mob id, such as `mob.slime`. */
  id: string;
  /** How many of that mob. */
  count: number;
};

/** A fight starting on the tile the hero just entered, or on the miniboss. */
export type EncounterEvent = {
  /** The walk stopped because a fight started. */
  type: "encounterStarted";
  /** Terrain the hero was standing on. A miniboss touch off the path still reports grass. */
  terrain: "grass" | "forest" | "path";
  /** Mobs in this fight, in the order they are fought. */
  groups: EncounterSpawn[];
  /** Set when the hero touched the miniboss. */
  miniboss?: true;
};

/** Where the miniboss stands, and how close a touch starts its fight. */
export type Miniboss = {
  /** Tile the miniboss occupies. The circle is centered in that tile. */
  tile: TilePoint;
  /** Radius of the miniboss circle, in tiles. Prototype one uses 0.8. */
  radius: number;
  /** Mob the touch starts, such as `mob.rust_sentinel`. */
  id: string;
};

/** What one stick hold did. The controller keeps the hero's new position. */
export type StickHold = {
  /** The fight that stopped the walk, if one started. */
  events: EncounterEvent[];
  /** Ticks used. Less than asked when a fight started early. */
  ticks: number;
  /** Tiles the hero moved during this hold. */
  distance: number;
};
