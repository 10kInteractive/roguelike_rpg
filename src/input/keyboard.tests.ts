import { expect, test } from "vitest";
import { stickLimit } from "../sim/field/movement.constants";
import { stickFromHeld } from "./keyboard";

test("held keys become a full stick, and opposite keys cancel", () => {
  expect(stickFromHeld([])).toEqual({ x: 0, y: 0 });
  expect(stickFromHeld(["ArrowUp"])).toEqual({ x: 0, y: stickLimit });
  expect(stickFromHeld(["KeyW", "KeyD"])).toEqual({ x: stickLimit, y: stickLimit });
  expect(stickFromHeld(["ArrowLeft", "ArrowRight"])).toEqual({ x: 0, y: 0 });
  expect(stickFromHeld(["KeyS"])).toEqual({ x: 0, y: -stickLimit });
});
