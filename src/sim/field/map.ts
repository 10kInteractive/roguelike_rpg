import { createRng, type Rng } from "../rng";

/** What a tile is made of. Grass, forest, and path can be walked. Water and mountain cannot. */
export type Terrain = "grass" | "forest" | "path" | "water" | "mountain";

/** A tile's column and row. The hero standing in its middle is at `(x + 0.5, y + 0.5)`. */
export type TilePoint = {
  /** Column. Increases east. */
  x: number;
  /** Row. Increases north. */
  y: number;
};

/** One seeded meadow: the tiles, where the hero starts, and where the miniboss stands. */
export type MeadowMap = {
  /** Columns. */
  width: number;
  /** Rows. */
  height: number;
  /** Terrain in row-major order. */
  tiles: Terrain[];
  /** Walkable tile the hero starts on. */
  spawn: TilePoint;
  /** Tile the miniboss occupies. The path runs here from the spawn. */
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
  /** Seed for the noise and for where the spawn and miniboss are picked. */
  seed: number;
  /** Columns. */
  width: number;
  /** Rows. */
  height: number;
  /** How far, in tiles, the miniboss must stand from the spawn. */
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
    tiles[tileIndex(width, center)] = "grass";
    walkable.push(center);
  }
  const spawn = pickTile(walkable, rng);

  // The miniboss stands far from that spawn. A small map uses the farthest tile.
  const far = pointsWhere(tiles, width, height, (_terrain, point) => {
    return point !== spawn && tileDistance(spawn, point) >= input.minibossDistance;
  });
  const miniboss = far.length > 0 ? pickTile(far, rng) : farthest(tiles, width, height, spawn);

  // The road overwrites whatever noise put down, so the two ends stay connected.
  layPath(tiles, width, spawn, miniboss);

  return { width, height, tiles, spawn, miniboss };
}

/** Grass, forest, and path. Water and mountain stop the hero. */
export function isWalkable(terrain: Terrain): boolean {
  return terrain === "grass" || terrain === "forest" || terrain === "path";
}

/** Straight-line distance between two tiles, in tile widths. */
export function tileDistance(from: TilePoint, to: TilePoint): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/** Water, mountain, forest, or grass from the two noise values. */
function terrainAt(heightValue: number, forestValue: number): Terrain {
  if (heightValue < waterBelow) return "water";
  if (heightValue > mountainAbove) return "mountain";
  if (forestValue > forestAbove) return "forest";
  return "grass";
}

/** Smoothed noise at a tile. Neighboring tiles change gradually. */
function sample(seed: number, x: number, y: number): number {
  const x0 = Math.floor(x / heightPeriod);
  const y0 = Math.floor(y / heightPeriod);
  const tx = (x % heightPeriod) / heightPeriod;
  const ty = (y % heightPeriod) / heightPeriod;
  const a = lerp(latticeValue(seed, x0, y0), latticeValue(seed, x0 + 1, y0), tx);
  const b = lerp(latticeValue(seed, x0, y0 + 1), latticeValue(seed, x0 + 1, y0 + 1), ty);
  return lerp(a, b, ty);
}

/** One noise value at a lattice point. The same seed and point always match. */
function latticeValue(seed: number, x: number, y: number): number {
  const mixed = (seed ^ Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b)) >>> 0;
  return createRng(mixed).next();
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
    const distance = tileDistance(from, point);
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
