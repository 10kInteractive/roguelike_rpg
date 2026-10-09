import { createRng, type Rng } from "../rng";

export type Terrain = "grass" | "forest" | "path" | "water" | "mountain";

export type TilePoint = { x: number; y: number };

export type MeadowMap = {
  width: number;
  height: number;
  tiles: Terrain[];
  spawn: TilePoint;
  miniboss: TilePoint;
};

const heightPeriod = 8;
const waterBelow = 0.38;
const mountainAbove = 0.7;
const forestAbove = 0.55;

/**
 * One seeded meadow.
 *
 * Height noise picks water, grass, and mountain. A second noise layer turns
 * some grass into forest. A path of path tiles joins the spawn to a miniboss
 * at least `minibossDistance` tiles away, so the miniboss is reachable.
 */
export function createMeadow(input: {
  seed: number;
  width: number;
  height: number;
  minibossDistance: number;
}): MeadowMap {
  const { width, height } = input;
  const tiles: Terrain[] = [];

  // Height and a second noise layer. Low ground is water, high ground is mountain.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const heightValue = sample(input.seed, x, y);
      const forestValue = sample(input.seed ^ 0x6d2b79f5, x, y);
      tiles.push(terrainAt(heightValue, forestValue));
    }
  }

  // The hero starts on walkable ground. A buried map gets a clearing at the center.
  const rng = createRng(input.seed);
  const walkable = pointsWhere(tiles, width, height, (terrain) => isWalkable(terrain));
  if (walkable.length === 0) {
    const center = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
    tiles[indexOf(width, center)] = "grass";
    walkable.push(center);
  }
  const spawn = pick(walkable, rng);

  // The miniboss stands far from that spawn. A small map uses the farthest tile.
  const far = pointsWhere(tiles, width, height, (_terrain, point) => {
    return point !== spawn && tileDistance(spawn, point) >= input.minibossDistance;
  });
  const miniboss = far.length > 0 ? pick(far, rng) : farthest(tiles, width, height, spawn);

  // The road overwrites whatever noise put down, so the two ends stay connected.
  layPath(tiles, width, spawn, miniboss);

  return { width, height, tiles, spawn, miniboss };
}

export function isWalkable(terrain: Terrain): boolean {
  return terrain === "grass" || terrain === "forest" || terrain === "path";
}

export function tileDistance(from: TilePoint, to: TilePoint): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

function terrainAt(heightValue: number, forestValue: number): Terrain {
  if (heightValue < waterBelow) return "water";
  if (heightValue > mountainAbove) return "mountain";
  if (forestValue > forestAbove) return "forest";
  return "grass";
}

function sample(seed: number, x: number, y: number): number {
  const x0 = Math.floor(x / heightPeriod);
  const y0 = Math.floor(y / heightPeriod);
  const tx = (x % heightPeriod) / heightPeriod;
  const ty = (y % heightPeriod) / heightPeriod;
  const a = lerp(unit(seed, x0, y0), unit(seed, x0 + 1, y0), tx);
  const b = lerp(unit(seed, x0, y0 + 1), unit(seed, x0 + 1, y0 + 1), ty);
  return lerp(a, b, ty);
}

function unit(seed: number, x: number, y: number): number {
  const mixed = (seed ^ Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b)) >>> 0;
  return createRng(mixed).next();
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function layPath(tiles: Terrain[], width: number, from: TilePoint, to: TilePoint): void {
  let x = from.x;
  let y = from.y;
  tiles[indexOf(width, { x, y })] = "path";
  while (x !== to.x) {
    x += Math.sign(to.x - x);
    tiles[indexOf(width, { x, y })] = "path";
  }
  while (y !== to.y) {
    y += Math.sign(to.y - y);
    tiles[indexOf(width, { x, y })] = "path";
  }
}

function farthest(tiles: Terrain[], width: number, height: number, from: TilePoint): TilePoint {
  let best = from;
  let bestDistance = -1;
  for (const point of pointsWhere(tiles, width, height, () => true)) {
    const distance = tileDistance(from, point);
    if (distance > bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}

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
      const terrain = tiles[indexOf(width, point)];
      if (terrain !== undefined && accept(terrain, point)) points.push(point);
    }
  }
  return points;
}

function pick(points: TilePoint[], rng: Rng): TilePoint {
  const point = points[Math.floor(rng.next() * points.length)];
  if (!point) throw new Error("No tile to place");
  return point;
}

function indexOf(width: number, point: TilePoint): number {
  return point.y * width + point.x;
}
