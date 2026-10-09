import { expect, test } from "vitest";
import type { Rng } from "../rng";
import { createEncounterState, walk } from "./encounters";
import type { Terrain } from "./map";
import { heroRadius, move, type Position } from "./movement";

const east = { x: 64, y: 0 };
const start: Position = { x: 0.5, y: 0.5 };

test("each terrain rolls its own rate, and a matching roll does not start a fight", () => {
  const grass = row("grass", 16);
  const quiet = walk({
    position: start,
    stick: east,
    ticks: 8,
    field: grass,
    tables: { grass: { rate: 0.1, packs: [slime] } },
    minDistance: 0,
    rng: rolls([0.1]),
    state: createEncounterState(0),
  });
  expect(quiet.events).toEqual([]);
  expect(quiet.ticks).toBe(8);

  const fight = walk({
    position: start,
    stick: east,
    ticks: 30,
    field: grass,
    tables: { grass: { rate: 0.1, packs: [slime] } },
    minDistance: 0,
    rng: rolls([0]),
    state: createEncounterState(0),
  });
  expect(fight.ticks).toBe(8);
  expect(fight.position).toEqual(move(start, east, 8, grass));
  expect(fight.events).toEqual([
    { type: "encounterStarted", terrain: "grass", groups: [{ id: "mob.slime", count: 1 }] },
  ]);

  const forest = walk({
    position: start,
    stick: east,
    ticks: 30,
    field: row("forest", 16),
    tables: {
      forest: { rate: 0, packs: [slime] },
      grass: { rate: 1, packs: [slime] },
    },
    minDistance: 0,
    rng: rolls([0]),
    state: createEncounterState(0),
  });
  expect(forest.events).toEqual([]);
});

test("fights stay 4 tiles apart, and the walk stops when one starts", () => {
  const field = row("grass", 20);
  const tables = {
    grass: {
      rate: 1,
      packs: [
        { weight: 50, groups: [{ id: "mob.slime", min: 1, max: 2 }] },
        { weight: 50, groups: [{ id: "mob.ember_imp", min: 1, max: 1 }] },
      ],
    },
  };
  const first = walk({
    position: start,
    stick: east,
    ticks: 30,
    field,
    tables,
    minDistance: 4,
    rng: rolls([0, 0, 0]),
    state: createEncounterState(4),
  });
  expect(first.events).toEqual([
    { type: "encounterStarted", terrain: "grass", groups: [{ id: "mob.slime", count: 1 }] },
  ]);
  expect(first.ticks).toBeLessThan(30);

  const gap = walk({
    position: first.position,
    stick: east,
    ticks: 22,
    field,
    tables,
    minDistance: 4,
    rng: rolls([0, 0, 0]),
    state: first.state,
  });
  expect(gap.events).toEqual([]);

  const second = walk({
    position: gap.position,
    stick: east,
    ticks: 40,
    field,
    tables,
    minDistance: 4,
    rng: rolls([0, 0.5]),
    state: gap.state,
  });
  expect(second.events).toEqual([
    { type: "encounterStarted", terrain: "grass", groups: [{ id: "mob.ember_imp", count: 1 }] },
  ]);
  const apart = Math.hypot(
    second.position.x - first.position.x,
    second.position.y - first.position.y,
  );
  expect(apart).toBeGreaterThanOrEqual(4);
});

test("touching the miniboss starts its fight, and walking clear of it does not", () => {
  const field = row("grass", 12);
  const miniboss = { tile: { x: 4, y: 0 }, radius: 0.8, id: "mob.rust_sentinel" };
  const center = { x: miniboss.tile.x + 0.5, y: miniboss.tile.y + 0.5 };
  const reach = miniboss.radius + heroRadius;
  const quiet = { grass: { rate: 0, packs: [slime] } };
  const touched = walk({
    position: start,
    stick: east,
    ticks: 40,
    field,
    tables: quiet,
    minDistance: 4,
    rng: rolls([]),
    state: createEncounterState(4),
    miniboss,
  });
  expect(touched.events).toEqual([
    {
      type: "encounterStarted",
      terrain: "grass",
      groups: [{ id: "mob.rust_sentinel", count: 1 }],
      miniboss: true,
    },
  ]);
  expect(touched.ticks).toBeLessThan(40);
  expect(
    Math.hypot(touched.position.x - center.x, touched.position.y - center.y),
  ).toBeLessThanOrEqual(reach);
  const before = move(start, east, touched.ticks - 1, field);
  expect(Math.hypot(before.x - center.x, before.y - center.y)).toBeGreaterThan(reach);

  const meadow = {
    width: 8,
    height: 4,
    tiles: Array.from({ length: 32 }, () => "grass" as const),
  };
  const aside = walk({
    position: start,
    stick: east,
    ticks: 30,
    field: meadow,
    tables: quiet,
    minDistance: 4,
    rng: rolls([]),
    state: createEncounterState(4),
    miniboss: { tile: { x: 3, y: 3 }, radius: 0.8, id: "mob.rust_sentinel" },
  });
  expect(aside.events).toEqual([]);
  expect(aside.ticks).toBe(30);
});

const slime = { weight: 1, groups: [{ id: "mob.slime", min: 1, max: 1 }] };

function row(terrain: Terrain, width: number) {
  return { width, height: 1, tiles: Array.from({ length: width }, () => terrain) };
}

function rolls(values: number[]): Rng {
  let index = 0;
  return {
    next() {
      const value = values[index] ?? 0;
      index += 1;
      return value;
    },
  };
}
