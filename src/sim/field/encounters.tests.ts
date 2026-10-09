import { expect, test } from "vitest";
import type { Rng } from "../utils/rng.types";
import { EncounterWalkController } from "./encounters.controller";
import type { Terrain } from "./map.types";
import { moveHeroAlongStick } from "./movement";
import { heroRadius } from "./movement.constants";
import type { Position } from "./movement.types";

const east = { x: 64, y: 0 };
const start: Position = { x: 0.5, y: 0.5 };

test("each terrain rolls its own rate, and a matching roll does not start a fight", () => {
  const grass = row("grass", 16);
  const quiet = new EncounterWalkController({
    position: start,
    field: grass,
    tables: { grass: { rate: 0.1, packs: [slime] } },
    minDistance: 0,
    rng: rolls([0.1]),
  }).holdStick(east, 8);
  expect(quiet.events).toEqual([]);
  expect(quiet.ticks).toBe(8);

  const started = new EncounterWalkController({
    position: start,
    field: grass,
    tables: { grass: { rate: 0.1, packs: [slime] } },
    minDistance: 0,
    rng: rolls([0]),
  });
  const fight = started.holdStick(east, 30);
  expect(fight.ticks).toBe(8);
  expect(started.position).toEqual(moveHeroAlongStick(start, east, 8, grass));
  expect(fight.events).toEqual([
    { type: "encounterStarted", terrain: "grass", groups: [{ id: "mob.slime", count: 1 }] },
  ]);

  const forest = new EncounterWalkController({
    position: start,
    field: row("forest", 16),
    tables: {
      forest: { rate: 0, packs: [slime] },
      grass: { rate: 1, packs: [slime] },
    },
    minDistance: 0,
    rng: rolls([0]),
  }).holdStick(east, 30);
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
  const walk = new EncounterWalkController({
    position: start,
    field,
    tables,
    minDistance: 4,
    rng: rolls([0, 0, 0, 0, 0.5]),
  });
  const first = walk.holdStick(east, 30);
  const firstPosition = { ...walk.position };
  expect(first.events).toEqual([
    { type: "encounterStarted", terrain: "grass", groups: [{ id: "mob.slime", count: 1 }] },
  ]);
  expect(first.ticks).toBeLessThan(30);

  const gap = walk.holdStick(east, 22);
  expect(gap.events).toEqual([]);

  const second = walk.holdStick(east, 40);
  expect(second.events).toEqual([
    { type: "encounterStarted", terrain: "grass", groups: [{ id: "mob.ember_imp", count: 1 }] },
  ]);
  const apart = Math.hypot(walk.position.x - firstPosition.x, walk.position.y - firstPosition.y);
  expect(apart).toBeGreaterThanOrEqual(4);
});

test("touching the miniboss starts its fight, and walking clear of it does not", () => {
  const field = row("grass", 12);
  const miniboss = { tile: { x: 4, y: 0 }, radius: 0.8, id: "mob.rust_sentinel" };
  const center = { x: miniboss.tile.x + 0.5, y: miniboss.tile.y + 0.5 };
  const reach = miniboss.radius + heroRadius;
  const quiet = { grass: { rate: 0, packs: [slime] } };
  const touchedWalk = new EncounterWalkController({
    position: start,
    field,
    tables: quiet,
    minDistance: 4,
    rng: rolls([]),
    miniboss,
  });
  const touched = touchedWalk.holdStick(east, 40);
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
    Math.hypot(touchedWalk.position.x - center.x, touchedWalk.position.y - center.y),
  ).toBeLessThanOrEqual(reach);
  const before = moveHeroAlongStick(start, east, touched.ticks - 1, field);
  expect(Math.hypot(before.x - center.x, before.y - center.y)).toBeGreaterThan(reach);

  const meadow = {
    width: 8,
    height: 4,
    tiles: Array.from({ length: 32 }, () => "grass" as const),
  };
  const aside = new EncounterWalkController({
    position: start,
    field: meadow,
    tables: quiet,
    minDistance: 4,
    rng: rolls([]),
    miniboss: { tile: { x: 3, y: 3 }, radius: 0.8, id: "mob.rust_sentinel" },
  }).holdStick(east, 30);
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
