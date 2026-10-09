import { expect, test } from "vitest";
import { stickLimit } from "../sim/field/movement.constants";
import { menuHeld, menuPresses, stickFromPad } from "./gamepad";
import type { PadReading } from "./gamepad.types";

const still: PadReading = {
  axisX: 0,
  axisY: 0,
  confirm: false,
  cancel: false,
  up: false,
  down: false,
  left: false,
  right: false,
};

test("a stick inside the dead zone is still, and a full tilt is a full press", () => {
  expect(stickFromPad(still)).toEqual({ x: 0, y: 0 });
  expect(stickFromPad({ ...still, axisX: 0.2, axisY: -0.2 })).toEqual({ x: 0, y: 0 });
  expect(stickFromPad({ ...still, axisX: 1 })).toEqual({ x: stickLimit, y: 0 });
  expect(stickFromPad({ ...still, axisX: -1 })).toEqual({ x: -stickLimit, y: 0 });
  expect(stickFromPad({ ...still, axisY: -1 })).toEqual({ x: 0, y: stickLimit });
  expect(stickFromPad({ ...still, axisY: 1 })).toEqual({ x: 0, y: -stickLimit });
});

test("the d-pad is a full press and overrides the stick on that axis", () => {
  expect(stickFromPad({ ...still, up: true, axisY: 1 })).toEqual({ x: 0, y: stickLimit });
  expect(stickFromPad({ ...still, left: true, right: true })).toEqual({ x: 0, y: 0 });
  expect(stickFromPad({ ...still, right: true, axisX: -1 })).toEqual({ x: stickLimit, y: 0 });
});

test("a menu direction registers at half a tilt, and opposites cancel", () => {
  expect(menuHeld({ ...still, axisY: -0.5 }).up).toBe(true);
  expect(menuHeld({ ...still, axisY: -0.4 }).up).toBe(false);
  expect(menuHeld({ ...still, axisX: 0.5 }).confirm).toBe(true);
  expect(menuHeld({ ...still, axisX: -0.5 }).cancel).toBe(true);
  expect(menuHeld({ ...still, confirm: true }).confirm).toBe(true);
  expect(menuHeld({ ...still, cancel: true }).cancel).toBe(true);
  expect(menuHeld({ ...still, up: true, down: true })).toEqual({
    up: false,
    down: false,
    confirm: false,
    cancel: false,
  });
  expect(menuHeld({ ...still, axisX: 0.8, axisY: 0.8 })).toEqual({
    up: false,
    down: true,
    confirm: false,
    cancel: false,
  });
  expect(menuHeld({ ...still, axisX: 0.9, axisY: 0.5 }).confirm).toBe(true);
  expect(menuHeld({ ...still, axisX: 0.9, axisY: 0.5 }).down).toBe(false);
});

test("a menu press fires when a direction becomes held, and not while it stays held", () => {
  const quiet = { up: false, down: false, confirm: false, cancel: false };
  expect(menuPresses(quiet, { ...quiet, up: true })).toEqual(["up"]);
  expect(menuPresses({ ...quiet, up: true }, { ...quiet, up: true })).toEqual([]);
  expect(menuPresses(quiet, { ...quiet, confirm: true, cancel: true })).toEqual([
    "cancel",
    "confirm",
  ]);
});
