import { expect, test } from "vitest";
import { MobSelectController } from "./select.controller";

test("up and down wrap the living line and start on the lead", () => {
  const select = new MobSelectController([0, 1, 2], 0);

  expect(select.chosen()).toBe(0);
  expect(select.move(1)).toBe(1);
  expect(select.move(1)).toBe(2);
  expect(select.move(1)).toBe(0);
  expect(select.move(-1)).toBe(2);
});

test("a fallen lead starts on the next living mob", () => {
  const select = new MobSelectController([1, 2], 0);
  expect(select.chosen()).toBe(1);
});

test("the last mob stays in focus when they are still standing", () => {
  const select = new MobSelectController([0, 2], 2);
  expect(select.chosen()).toBe(2);
});
