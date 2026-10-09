import { expect, test } from "vitest";
import { physicalDamage } from "./damage";

test("physical damage is attack minus half defense, times the spread, rounded down", () => {
  expect(physicalDamage(8, 4, 1)).toBe(6);
  expect(physicalDamage(8, 4, 0.9)).toBe(5);
  expect(physicalDamage(6, 2, 1.1)).toBe(5);
});

test("physical damage is at least 1", () => {
  expect(physicalDamage(1, 100, 0.9)).toBe(1);
});
