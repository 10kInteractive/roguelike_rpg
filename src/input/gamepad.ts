import { stickLimit } from "../sim/field/movement.constants";
import type { Stick } from "../sim/field/movement.types";
import { menuThreshold, stickDeadZone } from "./gamepad.constants";
import type { MenuDirection, PadReading } from "./gamepad.types";

/**
 * Which menu directions are held this sample.
 * Opposite directions cancel. A diagonal stick keeps its stronger axis, and a tie moves the cursor.
 */
export function menuHeld(reading: PadReading): Record<MenuDirection, boolean> {
  const stickUp = -reading.axisY;
  const stickDown = reading.axisY;
  const stickConfirm = reading.axisX;
  const stickCancel = -reading.axisX;
  const vertical = Math.max(stickUp, stickDown);
  const horizontal = Math.max(stickConfirm, stickCancel);
  const stickMoves = vertical >= horizontal;

  const up = reading.up || (stickMoves && stickUp >= menuThreshold);
  const down = reading.down || (stickMoves && stickDown >= menuThreshold);
  const confirm =
    reading.confirm || reading.right || (!stickMoves && stickConfirm >= menuThreshold);
  const cancel = reading.cancel || reading.left || (!stickMoves && stickCancel >= menuThreshold);
  return {
    up: up && !down,
    down: down && !up,
    confirm: confirm && !cancel,
    cancel: cancel && !confirm,
  };
}

/** Directions that just became held. A direction that was already held stays quiet. */
export function menuPresses(
  previous: Readonly<Record<MenuDirection, boolean>>,
  next: Readonly<Record<MenuDirection, boolean>>,
): MenuDirection[] {
  const presses: MenuDirection[] = [];
  if (next.up && !previous.up) presses.push("up");
  if (next.down && !previous.down) presses.push("down");
  if (next.cancel && !previous.cancel) presses.push("cancel");
  if (next.confirm && !previous.confirm) presses.push("confirm");
  return presses;
}

/**
 * The left stick and d-pad as one quantized stick.
 * The d-pad overrides the stick on any axis it holds. Up is north, +y.
 */
export function stickFromPad(reading: PadReading): Stick {
  let x = axisToStick(reading.axisX);
  let y = axisToStick(-reading.axisY);

  const east = reading.right ? 1 : 0;
  const west = reading.left ? 1 : 0;
  const north = reading.up ? 1 : 0;
  const south = reading.down ? 1 : 0;
  if (east !== 0 || west !== 0) x = (east - west) * stickLimit;
  if (north !== 0 || south !== 0) y = (north - south) * stickLimit;
  return { x, y };
}

/** One raw axis, −1 to 1, as an integer stick. Inside the dead zone it is still. */
function axisToStick(axis: number): number {
  const magnitude = Math.min(1, Math.abs(axis));
  if (magnitude <= stickDeadZone) return 0;
  const scaled = (magnitude - stickDeadZone) / (1 - stickDeadZone);
  return Math.round(Math.sign(axis) * scaled * stickLimit);
}
