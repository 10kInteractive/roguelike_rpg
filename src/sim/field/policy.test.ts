import { expect, test } from "vitest";
import { createRng, type Rng } from "../rng";
import type { FieldGrid } from "./movement";
import { casterWalk, fighterWalk, grinderLevel, grinderWalk, walkBatch } from "./policy";

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

function meadow(rows: readonly string[]): FieldGrid {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const tiles = rows.flatMap((row) =>
    [...row].map((cell) => (cell === "w" ? ("water" as const) : ("grass" as const))),
  );
  return { width, height, tiles };
}

test("the fighter and the caster hold one direction for a second", () => {
  const east = { stick: { x: 64, y: 0 }, ticks: walkBatch };
  const northeast = { stick: { x: 64, y: 64 }, ticks: walkBatch };
  expect(fighterWalk(rolls([0]))).toEqual(east);
  expect(casterWalk(rolls([0]))).toEqual(east);
  expect(fighterWalk(rolls([0.124]))).toEqual(east);
  expect(casterWalk(rolls([0.125]))).toEqual(northeast);
  expect(fighterWalk(createRng(3))).toEqual(casterWalk(createRng(3)));
});

test("the grinder wanders until level 5, then walks around water to the miniboss", () => {
  const field = meadow(["ggwgg", "ggwgg", "ggggg"]);
  const miniboss = { x: 4, y: 0 };
  const beside = { x: 1.5, y: 0.5 };

  const wandering = grinderWalk({
    position: beside,
    field,
    miniboss,
    level: grinderLevel - 1,
    rng: rolls([0]),
  });
  expect(wandering).toEqual({ stick: { x: 64, y: 0 }, ticks: walkBatch });

  let pulls = 0;
  const heading = grinderWalk({
    position: beside,
    field,
    miniboss,
    level: grinderLevel,
    rng: {
      next() {
        pulls += 1;
        return 0;
      },
    },
  });
  expect(heading).toEqual({ stick: { x: 0, y: 64 }, ticks: walkBatch });
  expect(pulls).toBe(0);

  const along = grinderWalk({
    position: { x: 1.5, y: 2.5 },
    field,
    miniboss,
    level: grinderLevel,
    rng: rolls([]),
  });
  expect(along.stick).toEqual({ x: 64, y: 0 });
  expect(
    grinderWalk({
      position: beside,
      field,
      miniboss,
      level: grinderLevel,
      rng: rolls([]),
    }),
  ).toEqual(heading);
});

test("an unreachable miniboss sends the grinder wandering", () => {
  const field = meadow(["gw"]);
  const choice = grinderWalk({
    position: { x: 0.5, y: 0.5 },
    field,
    miniboss: { x: 1, y: 0 },
    level: grinderLevel,
    rng: rolls([0]),
  });
  expect(choice).toEqual({ stick: { x: 64, y: 0 }, ticks: walkBatch });
});
