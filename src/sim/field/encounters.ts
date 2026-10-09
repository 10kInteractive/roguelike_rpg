import { pickWeighted } from "../combat/weighted";
import type { Rng } from "../rng";
import type { Terrain, TilePoint } from "./map";
import { type FieldGrid, heroRadius, move, type Position, type Stick } from "./movement";

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

/**
 * Distance walked so far, ready for the first tile to roll.
 *
 * After a fight, `distanceSinceFight` goes back to zero and the next tiles inside the
 * minimum distance do not roll.
 */
export function createEncounterState(minDistance: number): EncounterState {
  return { grass: 0, forest: 0, path: 0, distanceSinceFight: minDistance };
}

/**
 * Walks a stick for up to `ticks` and may start a fight.
 *
 * Each full tile of distance on grass, forest, or path rolls that terrain's
 * rate. The roll succeeds when it is below the rate. A success picks a pack
 * by weight, then a count in each group. Touching the miniboss starts its
 * fight instead. The walk stops on that tick. The returned distance is the
 * tiles actually moved.
 */
export function walk(input: {
  /** Where the hero is standing. */
  position: Position;
  /** How far the left stick is pushed for this walk. */
  stick: Stick;
  /** How many ticks to hold the stick, unless a fight starts first. */
  ticks: number;
  /** The meadow the hero is crossing. */
  field: FieldGrid;
  /** Encounter rates for grass, forest, and path. */
  tables: EncounterTables;
  /** Tiles that must pass between fights. */
  minDistance: number;
  /** Encounter rolls: the rate, the pack, and each group's count. */
  rng: Rng;
  /** Distance walked so far. This walk does not change the caller's copy. */
  state: EncounterState;
  /** When set, touching this circle starts its fight and ends the walk. */
  miniboss?: Miniboss;
}): {
  /** Where the hero stopped. */
  position: Position;
  /** Distance walked after this call. The input state is left alone. */
  state: EncounterState;
  /** The fight that stopped the walk, if one started. */
  events: EncounterEvent[];
  /** Ticks used. Less than asked when a fight started early. */
  ticks: number;
  /** Tiles the hero moved during this walk. */
  distance: number;
} {
  let position = input.position;
  const state = { ...input.state };
  const events: EncounterEvent[] = [];
  let distance = 0;

  if (input.miniboss && touchesMiniboss(position, input.miniboss)) {
    return contact(position, state, events, 0, distance, input.field, input.miniboss);
  }

  for (let tick = 0; tick < input.ticks; tick++) {
    const next = move(position, input.stick, 1, input.field);
    const step = Math.hypot(next.x - position.x, next.y - position.y);
    position = next;
    distance += step;
    state.distanceSinceFight += step;

    // Touching the miniboss starts its fight and spends no encounter roll.
    if (input.miniboss && touchesMiniboss(position, input.miniboss)) {
      return contact(position, state, events, tick + 1, distance, input.field, input.miniboss);
    }

    // The step counts toward the terrain under the hero.
    const terrain = terrainUnder(input.field, position);
    if (terrain !== "grass" && terrain !== "forest" && terrain !== "path") {
      continue;
    }
    state[terrain] += step;

    // One roll per full tile. Tiles inside the gap after a fight do not roll.
    while (state[terrain] >= 1) {
      state[terrain] -= 1;
      if (state.distanceSinceFight < input.minDistance) continue;
      const table = input.tables[terrain];
      if (!table || input.rng.next() >= table.rate) continue;

      const pack = pickWeighted(table.packs, input.rng.next());
      state.distanceSinceFight = 0;
      events.push({
        type: "encounterStarted",
        terrain,
        groups: pack.groups.map((group) => ({
          id: group.id,
          count: rollGroupSize(group, input.rng),
        })),
      });
      return { position, state, events, ticks: tick + 1, distance };
    }
  }

  return { position, state, events, ticks: input.ticks, distance };
}

/** True when the hero's circle meets the miniboss circle. */
function touchesMiniboss(position: Position, miniboss: Miniboss): boolean {
  const centerX = miniboss.tile.x + 0.5;
  const centerY = miniboss.tile.y + 0.5;
  const reach = miniboss.radius + heroRadius;
  const dx = position.x - centerX;
  const dy = position.y - centerY;
  return dx * dx + dy * dy <= reach * reach;
}

/** The fight started by touching the miniboss. The move ends here. */
function contact(
  position: Position,
  state: EncounterState,
  events: EncounterEvent[],
  ticks: number,
  distance: number,
  field: FieldGrid,
  miniboss: Miniboss,
): {
  position: Position;
  state: EncounterState;
  events: EncounterEvent[];
  ticks: number;
  distance: number;
} {
  state.distanceSinceFight = 0;
  const terrain = terrainUnder(field, position);
  events.push({
    type: "encounterStarted",
    terrain: terrain === "forest" || terrain === "path" ? terrain : "grass",
    groups: [{ id: miniboss.id, count: 1 }],
    miniboss: true,
  });
  return { position, state, events, ticks, distance };
}

/** The terrain under the hero's center, or nothing if that tile is off the map. */
function terrainUnder(field: FieldGrid, position: Position): Terrain | undefined {
  const x = Math.floor(position.x);
  const y = Math.floor(position.y);
  if (x < 0 || y < 0 || x >= field.width || y >= field.height) return undefined;
  return field.tiles[y * field.width + x];
}

/** How many of this mob appear. A fixed group spends no roll. */
function rollGroupSize(group: EncounterGroup, rng: Rng): number {
  if (group.max <= group.min) return group.min;
  const span = group.max - group.min + 1;
  return group.min + Math.floor(rng.next() * span);
}
