import { expect, test } from "vitest";
import { SeededRandomGenerator } from "../utils/rng.controller";
import type { Rng } from "../utils/rng.types";
import type { TilePoint } from "./map";
import type { FieldGrid } from "./movement";
import { grinderTargetLevel, stickHoldTicks } from "./policy.constants";
import { FieldWalkPolicy } from "./policy.controller";

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

function walker(rng: Rng, field = meadow(["g"]), miniboss: TilePoint = { x: 0, y: 0 }) {
  return new FieldWalkPolicy({ field, miniboss, rng });
}

test("the fighter and the caster hold one direction for a second", () => {
  const east = { stick: { x: 64, y: 0 }, ticks: stickHoldTicks };
  const northeast = { stick: { x: 64, y: 64 }, ticks: stickHoldTicks };
  expect(walker(rolls([0])).chooseFighter()).toEqual(east);
  expect(walker(rolls([0])).chooseCaster()).toEqual(east);
  expect(walker(rolls([0.124])).chooseFighter()).toEqual(east);
  expect(walker(rolls([0.125])).chooseCaster()).toEqual(northeast);
  expect(walker(new SeededRandomGenerator(3)).chooseFighter()).toEqual(
    walker(new SeededRandomGenerator(3)).chooseCaster(),
  );
});

test("the grinder wanders until level 5, then walks around water to the miniboss", () => {
  const field = meadow(["ggwgg", "ggwgg", "ggggg"]);
  const miniboss = { x: 4, y: 0 };
  const beside = { x: 1.5, y: 0.5 };

  const wandering = walker(rolls([0]), field, miniboss).chooseGrinder(
    beside,
    grinderTargetLevel - 1,
  );
  expect(wandering).toEqual({ stick: { x: 64, y: 0 }, ticks: stickHoldTicks });

  let pulls = 0;
  const counting: Rng = {
    next() {
      pulls += 1;
      return 0;
    },
  };
  const heading = walker(counting, field, miniboss).chooseGrinder(beside, grinderTargetLevel);
  expect(heading).toEqual({ stick: { x: 0, y: 64 }, ticks: stickHoldTicks });
  expect(pulls).toBe(0);

  const along = walker(rolls([]), field, miniboss).chooseGrinder(
    { x: 1.5, y: 2.5 },
    grinderTargetLevel,
  );
  expect(along.stick).toEqual({ x: 64, y: 0 });
  expect(walker(rolls([]), field, miniboss).chooseGrinder(beside, grinderTargetLevel)).toEqual(
    heading,
  );
});

test("an unreachable miniboss sends the grinder wandering", () => {
  const choice = walker(rolls([0]), meadow(["gw"]), { x: 1, y: 0 }).chooseGrinder(
    { x: 0.5, y: 0.5 },
    grinderTargetLevel,
  );
  expect(choice).toEqual({ stick: { x: 64, y: 0 }, ticks: stickHoldTicks });
});
