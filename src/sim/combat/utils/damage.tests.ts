import { expect, test } from "vitest";
import {
  applyCriticalHitDamage,
  applyDefendingDamageReduction,
  calculateElementDamageMultiplier,
  calculateMagicDamage,
  calculatePhysicalDamage,
} from "./damage";

test("physical damage is attack minus half defense, times the spread, rounded down", () => {
  expect(calculatePhysicalDamage(8, 4, 1)).toBe(6);
  expect(calculatePhysicalDamage(8, 4, 0.9)).toBe(5);
  expect(calculatePhysicalDamage(6, 2, 1.1)).toBe(5);
});

test("physical damage is at least 1", () => {
  expect(calculatePhysicalDamage(1, 100, 0.9)).toBe(1);
});

test("a critical hit multiplies damage by 1.5 and rounds down", () => {
  expect(applyCriticalHitDamage(5, 1.5)).toBe(7);
  expect(applyCriticalHitDamage(1, 1.5)).toBe(1);
});

test("defend halves a hit and still leaves at least 1", () => {
  expect(applyDefendingDamageReduction(4, 0.5)).toBe(2);
  expect(applyDefendingDamageReduction(1, 0.5)).toBe(1);
});

const weakness = 1.5;
const resistance = 0.5;
const ember = 8;
const frost = 8;
const mag = 6;

test("ember melts a frost moth and fizzles on an ember imp", () => {
  const moth = calculateElementDamageMultiplier("fire", "fire", "ice", weakness, resistance);
  const imp = calculateElementDamageMultiplier("fire", "ice", "fire", weakness, resistance);
  expect(calculateMagicDamage(ember, mag, moth, 1)).toBe(21);
  expect(calculateMagicDamage(ember, mag, imp, 1)).toBe(7);
});

test("frost melts an ember imp and fizzles on a frost moth", () => {
  const imp = calculateElementDamageMultiplier("ice", "ice", "fire", weakness, resistance);
  const moth = calculateElementDamageMultiplier("ice", "fire", "ice", weakness, resistance);
  expect(calculateMagicDamage(frost, mag, imp, 1)).toBe(21);
  expect(calculateMagicDamage(frost, mag, moth, 1)).toBe(7);
});

test("a spell on a slime is neither weak nor resisted", () => {
  const slime = calculateElementDamageMultiplier(
    "fire",
    undefined,
    undefined,
    weakness,
    resistance,
  );
  expect(calculateMagicDamage(ember, mag, slime, 1)).toBe(14);
});

test("magic damage uses the spread, rounds down, and is at least 1", () => {
  const moth = calculateElementDamageMultiplier("fire", "fire", "ice", weakness, resistance);
  const imp = calculateElementDamageMultiplier("fire", "ice", "fire", weakness, resistance);
  expect(calculateMagicDamage(ember, mag, moth, 0.9)).toBe(18);
  expect(calculateMagicDamage(ember, mag, imp, 0.9)).toBe(6);
  expect(calculateMagicDamage(0, 0, resistance, 0.9)).toBe(1);
});
