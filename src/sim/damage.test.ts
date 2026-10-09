import { expect, test } from "vitest";
import { applyCritical, elementMultiplier, magicDamage, physicalDamage } from "./damage";

test("physical damage is attack minus half defense, times the spread, rounded down", () => {
  expect(physicalDamage(8, 4, 1)).toBe(6);
  expect(physicalDamage(8, 4, 0.9)).toBe(5);
  expect(physicalDamage(6, 2, 1.1)).toBe(5);
});

test("physical damage is at least 1", () => {
  expect(physicalDamage(1, 100, 0.9)).toBe(1);
});

test("a critical hit multiplies damage by 1.5 and rounds down", () => {
  expect(applyCritical(5, 1.5)).toBe(7);
  expect(applyCritical(1, 1.5)).toBe(1);
});

const weakness = 1.5;
const resistance = 0.5;
const ember = 8;
const frost = 8;
const mag = 6;

test("ember melts a frost moth and fizzles on an ember imp", () => {
  const moth = elementMultiplier("fire", "fire", "ice", weakness, resistance);
  const imp = elementMultiplier("fire", "ice", "fire", weakness, resistance);
  expect(magicDamage(ember, mag, moth, 1)).toBe(21);
  expect(magicDamage(ember, mag, imp, 1)).toBe(7);
});

test("frost melts an ember imp and fizzles on a frost moth", () => {
  const imp = elementMultiplier("ice", "ice", "fire", weakness, resistance);
  const moth = elementMultiplier("ice", "fire", "ice", weakness, resistance);
  expect(magicDamage(frost, mag, imp, 1)).toBe(21);
  expect(magicDamage(frost, mag, moth, 1)).toBe(7);
});

test("a spell on a slime is neither weak nor resisted", () => {
  const slime = elementMultiplier("fire", undefined, undefined, weakness, resistance);
  expect(magicDamage(ember, mag, slime, 1)).toBe(14);
});

test("magic damage uses the spread, rounds down, and is at least 1", () => {
  const moth = elementMultiplier("fire", "fire", "ice", weakness, resistance);
  const imp = elementMultiplier("fire", "ice", "fire", weakness, resistance);
  expect(magicDamage(ember, mag, moth, 0.9)).toBe(18);
  expect(magicDamage(ember, mag, imp, 0.9)).toBe(6);
  expect(magicDamage(0, 0, resistance, 0.9)).toBe(1);
});
