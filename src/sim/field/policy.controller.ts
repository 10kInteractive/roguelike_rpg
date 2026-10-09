import type { Rng } from "../utils/rng.types";
import { isTerrainWalkable } from "./map";
import type { TilePoint } from "./map.types";
import { stickLimit } from "./movement.constants";
import type { FieldGrid, Position, Stick } from "./movement.types";
import {
  grinderTargetLevel,
  pathNeighbors,
  stickHoldTicks,
  wanderDirections,
} from "./policy.constants";
import type { WalkChoice } from "./policy.types";

/** How a robot hero walks the meadow: the fighter, the caster, or the grinder. */
export class FieldWalkPolicy {
  /** The meadow the hero is crossing. */
  private readonly field: FieldGrid;

  /** Tile the miniboss occupies. */
  private readonly miniboss: TilePoint;

  /** Direction rolls while wandering. */
  private readonly rng: Rng;

  constructor(input: {
    /** The meadow the hero is crossing. */
    field: FieldGrid;
    /** Tile the miniboss occupies. */
    miniboss: TilePoint;
    /** Direction rolls while wandering. */
    rng: Rng;
  }) {
    this.field = input.field;
    this.miniboss = input.miniboss;
    this.rng = input.rng;
  }

  /**
   * The fighter's walk.
   *
   * One roll picks a direction, and the fighter holds it for a second. Roll 0
   * is east. The directions then turn counterclockwise.
   */
  chooseFighter(): WalkChoice {
    return this.wander();
  }

  /**
   * The caster's walk.
   *
   * The caster wanders the same way the fighter does.
   */
  chooseCaster(): WalkChoice {
    return this.wander();
  }

  /**
   * The grinder's walk.
   *
   * Below level 5 the grinder wanders. At level 5 it steers toward the next
   * tile on the shortest walk to the miniboss. An unreachable miniboss is a wander.
   *
   * @param position Where the hero is standing, in tile units.
   * @param level The hero's current level.
   */
  chooseGrinder(position: Position, level: number): WalkChoice {
    if (level < grinderTargetLevel) return this.wander();

    const here = { x: Math.floor(position.x), y: Math.floor(position.y) };
    const path = this.pathTo(here, this.miniboss);
    const next = path[1] ?? path[0];
    if (!next) return this.wander();
    return { stick: this.steer(position, next), ticks: stickHoldTicks };
  }

  /** One of the eight directions, held for a second. */
  private wander(): WalkChoice {
    const index = Math.floor(this.rng.next() * wanderDirections.length);
    const stick = wanderDirections[index] ?? { x: stickLimit, y: 0 };
    return { stick, ticks: stickHoldTicks };
  }

  /**
   * The shortest walk from one tile to another.
   *
   * Steps are the four neighbors. An earlier tile wins when two routes look
   * equal. The list starts with the tile the hero is on. An empty list means
   * the hero cannot stand on the start or the goal.
   */
  private pathTo(from: TilePoint, goal: TilePoint): TilePoint[] {
    if (!this.canStand(from.x, from.y) || !this.canStand(goal.x, goal.y)) return [];
    if (from.x === goal.x && from.y === goal.y) return [from];

    const start = this.tileKey(from.x, from.y);
    const openSet: { x: number; y: number; g: number; f: number }[] = [
      { x: from.x, y: from.y, g: 0, f: this.manhattan(from, goal) },
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
        return this.rebuild(cameFrom, this.tileKey(goal.x, goal.y));
      }
      if (current.g !== best.get(this.tileKey(current.x, current.y))) continue;

      // One step to each walkable neighbor.
      for (const step of pathNeighbors) {
        const x = current.x + step.x;
        const y = current.y + step.y;
        if (!this.canStand(x, y)) continue;
        const g = current.g + 1;
        const id = this.tileKey(x, y);
        if (g >= (best.get(id) ?? Number.POSITIVE_INFINITY)) continue;
        best.set(id, g);
        cameFrom.set(id, this.tileKey(current.x, current.y));
        openSet.push({ x, y, g, f: g + this.manhattan({ x, y }, goal) });
      }
    }

    return [];
  }

  /** Stick toward the center of a tile. The longer axis is a full press. */
  private steer(position: Position, tile: TilePoint): Stick {
    const dx = tile.x + 0.5 - position.x;
    const dy = tile.y + 0.5 - position.y;
    const span = Math.max(Math.abs(dx), Math.abs(dy));
    if (span === 0) return { x: 0, y: 0 };
    return {
      x: Math.round((dx / span) * stickLimit),
      y: Math.round((dy / span) * stickLimit),
    };
  }

  /** True when the hero can stand on this tile. Water, mountain, and the void cannot. */
  private canStand(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.field.width || y >= this.field.height) return false;
    const terrain = this.field.tiles[y * this.field.width + x];
    return terrain !== undefined && isTerrainWalkable(terrain);
  }

  /** Tiles of walking if the hero only steps to the four neighbors. */
  private manhattan(from: TilePoint, to: TilePoint): number {
    return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
  }

  /** One number for a tile, so the search can remember where it came from. */
  private tileKey(x: number, y: number): number {
    return y * this.field.width + x;
  }

  /** The tiles from the hero to the goal, following each step's parent. */
  private rebuild(cameFrom: Map<number, number>, goalKey: number): TilePoint[] {
    const width = this.field.width;
    const tiles: TilePoint[] = [];
    let current: number | undefined = goalKey;
    while (current !== undefined) {
      tiles.push({ x: current % width, y: Math.floor(current / width) });
      current = cameFrom.get(current);
    }
    tiles.reverse();
    return tiles;
  }
}
