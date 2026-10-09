import { expect, test } from "vitest";
import { maxFrameSeconds } from "./fixed-step.constants";
import { FixedStepClock } from "./fixed-step.controller";

function stepsOver(clock: FixedStepClock, frames: number, frameSeconds: number): number {
  let steps = 0;
  for (let i = 0; i < frames; i++) steps += clock.advance(frameSeconds);
  return steps;
}

test("a 60 Hz display runs 30 sim steps per second", () => {
  const clock = new FixedStepClock(30);
  const steps = stepsOver(clock, 600, 1 / 60);
  expect(Math.abs(steps - 300)).toBeLessThanOrEqual(1);
});

test("a 144 Hz display still runs 30 sim steps per second", () => {
  const clock = new FixedStepClock(30);
  const steps = stepsOver(clock, 1440, 1 / 144);
  expect(Math.abs(steps - 300)).toBeLessThanOrEqual(1);
});

test("a slow 20 Hz frame runs more than one step", () => {
  const clock = new FixedStepClock(30);
  expect(stepsOver(clock, 2, 1 / 20)).toBe(3);
});

test("a long stall catches up at most the capped time", () => {
  const clock = new FixedStepClock(30);
  expect(clock.advance(60)).toBe(Math.floor(maxFrameSeconds * 30));
});

test("blend is the leftover fraction of a step", () => {
  const clock = new FixedStepClock(30);
  expect(clock.advance(1 / 60)).toBe(0);
  expect(clock.blend).toBeCloseTo(0.5);
  clock.advance(1 / 60);
  expect(clock.blend).toBeLessThan(0.01);
});
