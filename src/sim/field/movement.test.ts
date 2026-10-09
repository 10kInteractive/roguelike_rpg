import { expect, test } from "vitest";
import { move, type Position, type Stick, tilesPerSecond } from "./movement";

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

function walk(start: Position, sticks: Stick[]): Position {
  let position = start;
  for (const stick of sticks) position = move(position, stick, 5);
  return position;
}
