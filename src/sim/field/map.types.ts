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

/** What a meadow is built from. */
export type MeadowInput = {
  /** Seed for the noise and for where the spawn and miniboss are picked. */
  seed: number;
  /** Columns. */
  width: number;
  /** Rows. */
  height: number;
  /** How far, in tiles, the miniboss must stand from the spawn. */
  minibossDistance: number;
};
