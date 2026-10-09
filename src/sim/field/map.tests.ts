import { expect, test } from "vitest";
import {
  createSeededMeadow,
  distanceBetweenTiles,
  isTerrainWalkable,
  sampleMeadowNoise,
} from "./map";
import { heightPeriod } from "./map.constants";
import type { MeadowMap } from "./map.types";

const meadow = { width: 48, height: 48, minibossDistance: 20 };

test("the same seed builds the same meadow", () => {
  const once = createSeededMeadow({ seed: 7, ...meadow });
  const twice = createSeededMeadow({ seed: 7, ...meadow });
  expect(twice).toEqual(once);
});

test("spawn and the miniboss are reachable on many seeds", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const map = createSeededMeadow({ seed, ...meadow });
    expect(distanceBetweenTiles(map.spawn, map.miniboss)).toBeGreaterThanOrEqual(
      meadow.minibossDistance,
    );
    expect(isTerrainWalkable(tileAt(map, map.spawn))).toBe(true);
    expect(isTerrainWalkable(tileAt(map, map.miniboss))).toBe(true);
    expect(reachable(map)).toBe(true);
  }
});

test("noise changes gradually east–west and north–south", () => {
  // One tile is an eighth of the way between seeded values, so a step moves the blend at most 1/8.
  const largestStep = 1 / heightPeriod + 1e-9;
  for (let seed = 1; seed <= 20; seed++) {
    for (let y = 0; y < meadow.height; y++) {
      for (let x = 0; x < meadow.width; x++) {
        const here = sampleMeadowNoise(seed, x, y);
        expect(Math.abs(sampleMeadowNoise(seed, x + 1, y) - here)).toBeLessThanOrEqual(largestStep);
        expect(Math.abs(sampleMeadowNoise(seed, x, y + 1) - here)).toBeLessThanOrEqual(largestStep);
      }
    }
  }
});

function tileAt(map: MeadowMap, point: { x: number; y: number }) {
  const terrain = map.tiles[point.y * map.width + point.x];
  if (!terrain) throw new Error("tile outside the map");
  return terrain;
}

function reachable(map: MeadowMap): boolean {
  const start = map.spawn.y * map.width + map.spawn.x;
  const goal = map.miniboss.y * map.width + map.miniboss.x;
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    if (current === goal) return true;
    const x = current % map.width;
    const y = Math.floor(current / map.width);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nextX = x + dx;
      const nextY = y + dy;
      if (nextX < 0 || nextY < 0 || nextX >= map.width || nextY >= map.height) continue;
      const next = nextY * map.width + nextX;
      const terrain = map.tiles[next];
      if (seen.has(next) || terrain === undefined || !isTerrainWalkable(terrain)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}
