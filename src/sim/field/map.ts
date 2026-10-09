import { hashToUnit } from "../utils/rng";
import { SeededRandomGenerator } from "../utils/rng.controller";
import type { Rng } from "../utils/rng.types";
import { forestAbove, heightPeriod, mountainAbove, waterBelow } from "./map.constants";
import type { MeadowInput, MeadowMap, Terrain, TilePoint } from "./map.types";

/**
 * One seeded meadow.
 *
 * Height noise picks water, grass, and mountain. A second noise layer turns
 * some grass into forest. A path of path tiles joins the spawn to a miniboss
 * at least `minibossDistance` tiles away, so the miniboss is reachable.
 */
export function createSeededMeadow(input: MeadowInput): MeadowMap {
  const { width, height } = input;
  const tiles: Terrain[] = [];

  // Height and a second noise layer. Low ground is water, high ground is mountain.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const heightValue = sampleMeadowNoise(input.seed, x, y);
      const forestValue = sampleMeadowNoise(input.seed ^ 0x6d2b79f5, x, y);
      tiles.push(terrainAt(heightValue, forestValue));
    }
  }

  // The hero starts on walkable ground. A buried map gets a clearing at the center.
  const rng = new SeededRandomGenerator(input.seed);
  const walkable = pointsWhere(tiles, width, height, (terrain) => isTerrainWalkable(terrain));
  if (walkable.length === 0) {
    const center = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
    tiles[tileIndex(width, center)] = "grass";
    walkable.push(center);
  }
  const spawn = pickTile(walkable, rng);

  // The miniboss stands far from that spawn. A small map uses the farthest tile.
  const far = pointsWhere(tiles, width, height, (_terrain, point) => {
    return point !== spawn && distanceBetweenTiles(spawn, point) >= input.minibossDistance;
  });
  const miniboss = far.length > 0 ? pickTile(far, rng) : farthest(tiles, width, height, spawn);

  // The road overwrites whatever noise put down, so the two ends stay connected.
  layPath(tiles, width, spawn, miniboss);

  return { width, height, tiles, spawn, miniboss };
}

/** Grass, forest, and path. Water and mountain stop the hero. */
export function isTerrainWalkable(terrain: Terrain): boolean {
  return terrain === "grass" || terrain === "forest" || terrain === "path";
}

/** Straight-line distance between two tiles, in tile widths. */
export function distanceBetweenTiles(from: TilePoint, to: TilePoint): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/** Water, mountain, forest, or grass from the two noise values. */
function terrainAt(heightValue: number, forestValue: number): Terrain {
  if (heightValue < waterBelow) return "water";
  if (heightValue > mountainAbove) return "mountain";
  if (forestValue > forestAbove) return "forest";
  return "grass";
}

/**
 * Smoothed noise at a tile, in [0, 1). Neighboring tiles change gradually.
 *
 * Seeded values sit every `heightPeriod` tiles. A tile blends the four around
 * it: east–west along the row above and below, then north–south between those.
 */
export function sampleMeadowNoise(seed: number, x: number, y: number): number {
  const x0 = Math.floor(x / heightPeriod);
  const y0 = Math.floor(y / heightPeriod);
  const tx = (x % heightPeriod) / heightPeriod;
  const ty = (y % heightPeriod) / heightPeriod;
  const a = lerp(latticeValue(seed, x0, y0), latticeValue(seed, x0 + 1, y0), tx);
  const b = lerp(latticeValue(seed, x0, y0 + 1), latticeValue(seed, x0 + 1, y0 + 1), tx);
  return lerp(a, b, ty);
}

/** One noise value at a lattice point. The same seed and point always match. */
function latticeValue(seed: number, x: number, y: number): number {
  const mixed = (seed ^ Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b)) >>> 0;
  return hashToUnit(mixed);
}

/** The blend from one noise sample to the next. */
function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Paints an L of path tiles from the spawn to the miniboss, horizontal then vertical. */
function layPath(tiles: Terrain[], width: number, from: TilePoint, to: TilePoint): void {
  let x = from.x;
  let y = from.y;
  tiles[tileIndex(width, { x, y })] = "path";
  while (x !== to.x) {
    x += Math.sign(to.x - x);
    tiles[tileIndex(width, { x, y })] = "path";
  }
  while (y !== to.y) {
    y += Math.sign(to.y - y);
    tiles[tileIndex(width, { x, y })] = "path";
  }
}

/** The tile farthest from the spawn, used when the map is too small for the requested gap. */
function farthest(tiles: Terrain[], width: number, height: number, from: TilePoint): TilePoint {
  let best = from;
  let bestDistance = -1;
  for (const point of pointsWhere(tiles, width, height, () => true)) {
    const distance = distanceBetweenTiles(from, point);
    if (distance > bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}

/** Tiles whose terrain passes the test. */
function pointsWhere(
  tiles: Terrain[],
  width: number,
  height: number,
  accept: (terrain: Terrain, point: TilePoint) => boolean,
): TilePoint[] {
  const points: TilePoint[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const point = { x, y };
      const terrain = tiles[tileIndex(width, point)];
      if (terrain !== undefined && accept(terrain, point)) points.push(point);
    }
  }
  return points;
}

/** One tile from the list. Roll 0 is the first tile. */
function pickTile(points: TilePoint[], rng: Rng): TilePoint {
  const point = points[Math.floor(rng.next() * points.length)];
  if (!point) throw new Error("No tile to place");
  return point;
}

/** Where a tile sits in the row-major list. */
function tileIndex(width: number, point: TilePoint): number {
  return point.y * width + point.x;
}
