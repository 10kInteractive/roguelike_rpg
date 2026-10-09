import { expect, test } from "vitest";
import { SeededRandomGenerator } from "./rng";

function take(seed: number, count: number): number[] {
  const rng = new SeededRandomGenerator(seed);
  return Array.from({ length: count }, () => rng.next());
}

test("the same seed gives the same sequence", () => {
  expect(take(1, 8)).toEqual(take(1, 8));
});

test("a different seed diverges", () => {
  expect(take(1, 1)).not.toEqual(take(2, 1));
});

test("seed 1 stays on the mulberry32 sequence", () => {
  expect(take(1, 4)).toEqual([
    0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741,
  ]);
});
