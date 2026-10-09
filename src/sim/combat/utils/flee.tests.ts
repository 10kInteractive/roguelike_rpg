import { expect, test } from "vitest";
import { calculateFleeChance } from "./flee";

test("flee chance is 50% plus 5% per point of haste, clamped to 10%–90%", () => {
  expect(calculateFleeChance(8, 5, 0.5, 0.05, 0.1, 0.9)).toBe(0.65);
  expect(calculateFleeChance(8, 8, 0.5, 0.05, 0.1, 0.9)).toBe(0.5);
  expect(calculateFleeChance(1, 20, 0.5, 0.05, 0.1, 0.9)).toBe(0.1);
  expect(calculateFleeChance(30, 5, 0.5, 0.05, 0.1, 0.9)).toBe(0.9);
});
