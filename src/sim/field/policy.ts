import type { Rng } from "../rng";
import { isWalkable, type TilePoint } from "./map";
import { type FieldGrid, type Position, type Stick, stickLimit } from "./movement";

/** How long a walking policy holds one stick. Thirty ticks is one second. */
export const walkBatch = 30;

/** The grinder heads for the miniboss once the hero reaches this level. */
export const grinderLevel = 5;

/** A stick held for a batch of field ticks. */
export type WalkChoice = {
  /** Integer stick from −64 to 64 on each axis. */
  stick: Stick;
  /** How many ticks to hold the stick. */
  ticks: number;
};

const directions: readonly Stick[] = [
  { x: stickLimit, y: 0 },
  { x: stickLimit, y: stickLimit },
  { x: 0, y: stickLimit },
  { x: -stickLimit, y: stickLimit },
  { x: -stickLimit, y: 0 },
  { x: -stickLimit, y: -stickLimit },
  { x: 0, y: -stickLimit },
  { x: stickLimit, y: -stickLimit },
];

const steps: readonly TilePoint[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

/**
 * The fighter's walk.
 *
 * One roll picks a direction, and the fighter holds it for a second. Roll 0 is
 * east. The directions then turn counterclockwise.
 */
export function fighterWalk(rng: Rng): WalkChoice {
  return wander(rng);
}

/**
 * The caster's walk.
 *
 * The caster wanders the same way the fighter does.
 */
export function casterWalk(rng: Rng): WalkChoice {
  return wander(rng);
}

/**
 * The grinder's walk.
 *
 * Below level 5 the grinder wanders. At level 5 it steers toward the next tile
 * on the shortest walk to the miniboss. An unreachable miniboss is a wander.
 */
export function grinderWalk(input: {
  /** Where the hero is standing, in tile units. */
  position: Position;
  /** The meadow the hero is crossing. */
  field: FieldGrid;
  /** Tile the miniboss occupies. */
  miniboss: TilePoint;
  /** The hero's current level. */
  level: number;
  /** Direction rolls while the grinder is still wandering. */
  rng: Rng;
}): WalkChoice {
  if (input.level < grinderLevel) return wander(input.rng);

  const here = { x: Math.floor(input.position.x), y: Math.floor(input.position.y) };
  const path = pathTo(input.field, here, input.miniboss);
  const next = path[1] ?? path[0];
  if (!next) return wander(input.rng);
  return { stick: steer(input.position, next), ticks: walkBatch };
}

/** One of the eight directions, held for a second. */
function wander(rng: Rng): WalkChoice {
  const index = Math.floor(rng.next() * directions.length);
  const stick = directions[index] ?? { x: stickLimit, y: 0 };
  return { stick, ticks: walkBatch };
}

/**
 * The shortest walk from one tile to another.
 *
 * Steps are the four neighbors. An earlier tile wins when two routes look
 * equal. The list starts with the tile the hero is on. An empty list means
 * the hero cannot stand on the start or the goal.
 */
function pathTo(field: FieldGrid, from: TilePoint, goal: TilePoint): TilePoint[] {
  if (!open(field, from.x, from.y) || !open(field, goal.x, goal.y)) return [];
  if (from.x === goal.x && from.y === goal.y) return [from];

  const start = key(field.width, from.x, from.y);
  const openSet: { x: number; y: number; g: number; f: number }[] = [
    { x: from.x, y: from.y, g: 0, f: manhattan(from, goal) },
  ];
  const cameFrom = new Map<number, number>();
  const best = new Map<number, number>([[start, 0]]);

  while (openSet.length > 0) {
    // The cheapest estimate goes next. An earlier tile wins a tie.
    let pick = 0;
    for (let index = 1; index < openSet.length; index++) {
      const candidate = openSet[index];
      if (candidate && candidate.f < (openSet[pick]?.f ?? Number.POSITIVE_INFINITY)) pick = index;
    }
    const current = openSet.splice(pick, 1)[0];
    if (!current) break;
    if (current.x === goal.x && current.y === goal.y) {
      return rebuild(cameFrom, key(field.width, goal.x, goal.y), field.width);
    }
    if (current.g !== best.get(key(field.width, current.x, current.y))) continue;

    // One step to each walkable neighbor.
    for (const step of steps) {
      const x = current.x + step.x;
      const y = current.y + step.y;
      if (!open(field, x, y)) continue;
      const g = current.g + 1;
      const id = key(field.width, x, y);
      if (g >= (best.get(id) ?? Number.POSITIVE_INFINITY)) continue;
      best.set(id, g);
      cameFrom.set(id, key(field.width, current.x, current.y));
      openSet.push({ x, y, g, f: g + manhattan({ x, y }, goal) });
    }
  }

  return [];
}

/** Stick toward the center of a tile. The longer axis is a full press. */
function steer(position: Position, tile: TilePoint): Stick {
  const dx = tile.x + 0.5 - position.x;
  const dy = tile.y + 0.5 - position.y;
  const span = Math.max(Math.abs(dx), Math.abs(dy));
  if (span === 0) return { x: 0, y: 0 };
  return {
    x: Math.round((dx / span) * stickLimit),
    y: Math.round((dy / span) * stickLimit),
  };
}

function open(field: FieldGrid, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= field.width || y >= field.height) return false;
  const terrain = field.tiles[y * field.width + x];
  return terrain !== undefined && isWalkable(terrain);
}

function manhattan(from: TilePoint, to: TilePoint): number {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
}

function key(width: number, x: number, y: number): number {
  return y * width + x;
}

function rebuild(cameFrom: Map<number, number>, goalKey: number, width: number): TilePoint[] {
  const tiles: TilePoint[] = [];
  let current: number | undefined = goalKey;
  while (current !== undefined) {
    tiles.push({ x: current % width, y: Math.floor(current / width) });
    current = cameFrom.get(current);
  }
  tiles.reverse();
  return tiles;
}
