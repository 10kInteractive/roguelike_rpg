import { pickWeighted } from "../combat/weighted";
import type { Rng } from "../rng";
import type { Terrain, TilePoint } from "./map";
import { type FieldGrid, heroRadius, move, type Position, type Stick } from "./movement";

export type EncounterGroup = { id: string; min: number; max: number };

export type EncounterPack = {
  weight: number;
  groups: readonly EncounterGroup[];
};

export type TerrainTable = {
  rate: number;
  packs: readonly EncounterPack[];
};

export type EncounterTables = Partial<Record<"grass" | "forest" | "path", TerrainTable>>;

export type EncounterState = {
  grass: number;
  forest: number;
  path: number;
  sinceFight: number;
};

export type EncounterEvent = {
  type: "encounterStarted";
  terrain: "grass" | "forest" | "path";
  groups: { id: string; count: number }[];
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
 * After a fight, `sinceFight` goes back to zero and the next tiles inside the
 * minimum distance do not roll.
 */
export function createEncounterState(minDistance: number): EncounterState {
  return { grass: 0, forest: 0, path: 0, sinceFight: minDistance };
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
  position: Position;
  stick: Stick;
  ticks: number;
  field: FieldGrid;
  tables: EncounterTables;
  minDistance: number;
  rng: Rng;
  state: EncounterState;
  /** When set, touching this circle starts its fight and ends the walk. */
  miniboss?: Miniboss;
}): {
  position: Position;
  state: EncounterState;
  events: EncounterEvent[];
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
    state.sinceFight += step;

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
      if (state.sinceFight < input.minDistance) continue;
      const table = input.tables[terrain];
      if (!table || input.rng.next() >= table.rate) continue;

      const pack = pickWeighted(table.packs, input.rng.next());
      state.sinceFight = 0;
      events.push({
        type: "encounterStarted",
        terrain,
        groups: pack.groups.map((group) => ({
          id: group.id,
          count: groupCount(group, input.rng),
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
  state.sinceFight = 0;
  const terrain = terrainUnder(field, position);
  events.push({
    type: "encounterStarted",
    terrain: terrain === "forest" || terrain === "path" ? terrain : "grass",
    groups: [{ id: miniboss.id, count: 1 }],
    miniboss: true,
  });
  return { position, state, events, ticks, distance };
}

function terrainUnder(field: FieldGrid, position: Position): Terrain | undefined {
  const x = Math.floor(position.x);
  const y = Math.floor(position.y);
  if (x < 0 || y < 0 || x >= field.width || y >= field.height) return undefined;
  return field.tiles[y * field.width + x];
}

function groupCount(group: EncounterGroup, rng: Rng): number {
  if (group.max <= group.min) return group.min;
  const span = group.max - group.min + 1;
  return group.min + Math.floor(rng.next() * span);
}
