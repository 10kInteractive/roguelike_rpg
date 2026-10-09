import { expect, test } from "vitest";
import type { Terrain } from "./map";
import {
  type FieldGrid,
  heroRadius,
  move,
  type Position,
  type Stick,
  tilesPerSecond,
} from "./movement";

const origin: Position = { x: 0, y: 0 };

test("the same sticks end at the same position", () => {
  const sticks: Stick[] = [
    { x: 64, y: 0 },
    { x: 64, y: 64 },
    { x: 0, y: -64 },
    { x: -32, y: 16 },
  ];
  expect(walk(origin, sticks)).toEqual(walk(origin, sticks));

  let stepped = origin;
  for (let tick = 0; tick < 30; tick++) stepped = move(stepped, { x: 64, y: 32 });
  expect(stepped).toEqual(move(origin, { x: 64, y: 32 }, 30));
});

test("a diagonal step covers the same distance as a straight one", () => {
  const east = move(origin, { x: 64, y: 0 }, 30);
  const northeast = move(origin, { x: 64, y: 64 }, 30);
  expect(east).toEqual({ x: tilesPerSecond, y: 0 });
  expect(Math.hypot(northeast.x, northeast.y)).toBeCloseTo(tilesPerSecond, 10);
  expect(move(origin, { x: 128, y: 0 }, 30)).toEqual(east);
});

test("the hero slides along a blocked edge and does not enter it", () => {
  const shore = grid(4, 2, [
    "water",
    "water",
    "water",
    "water",
    "grass",
    "grass",
    "grass",
    "grass",
  ]);
  const start = { x: 0.5, y: 1.5 };
  const slid = move(start, { x: 64, y: -64 }, 60, shore);
  expect(slid).toEqual(move(start, { x: 64, y: -64 }, 60, shore));
  expect(slid.x).toBeGreaterThan(start.x);
  expect(slid.y).toBeLessThan(start.y);
  expect(slid.y).toBeGreaterThanOrEqual(1 + heroRadius);

  const bank = grid(2, 1, ["grass", "water"]);
  const stopped = move({ x: 0.5, y: 0.5 }, { x: 64, y: 0 }, 30, bank);
  expect(stopped.y).toBe(0.5);
  expect(stopped.x).toBeGreaterThan(0.5);
  expect(stopped.x).toBeLessThanOrEqual(1 - heroRadius);
});

function grid(width: number, height: number, tiles: Terrain[]): FieldGrid {
  return { width, height, tiles };
}

function walk(start: Position, sticks: Stick[]): Position {
  let position = start;
  for (const stick of sticks) position = move(position, stick, 5);
  return position;
}
