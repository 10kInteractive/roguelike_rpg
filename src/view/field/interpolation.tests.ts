import { expect, test } from "vitest";
import { PositionInterpolator } from "./interpolation.controller";

test("before any step, every blend is the start", () => {
  const motion = new PositionInterpolator({ x: 2, y: 3 });
  expect(motion.at(0)).toEqual({ x: 2, y: 3 });
  expect(motion.at(1)).toEqual({ x: 2, y: 3 });
});

test("blends between the last two steps", () => {
  const motion = new PositionInterpolator({ x: 0, y: 0 });
  motion.push({ x: 1, y: 0 });
  motion.push({ x: 2, y: 1 });
  expect(motion.at(0)).toEqual({ x: 1, y: 0 });
  expect(motion.at(0.5)).toEqual({ x: 1.5, y: 0.5 });
  expect(motion.at(1)).toEqual({ x: 2, y: 1 });
  expect(motion.latest()).toEqual({ x: 2, y: 1 });
  expect(motion.lastStep()).toEqual({ x: 1, y: 1 });
});
