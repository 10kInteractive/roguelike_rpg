/** One sample of a standard-mapping pad. Stick axes are the browser's: +y points down. */
export type PadReading = {
  /** Left stick, −1 at left to 1 at right. */
  axisX: number;
  /** Left stick, −1 at up to 1 at down. */
  axisY: number;
  /** A is held. */
  confirm: boolean;
  /** B is held. */
  cancel: boolean;
  /** D-pad up is held. */
  up: boolean;
  /** D-pad down is held. */
  down: boolean;
  /** D-pad left is held. */
  left: boolean;
  /** D-pad right is held. */
  right: boolean;
};

/** A menu press. Right and A confirm. Left and B cancel. */
export type MenuDirection = "up" | "down" | "confirm" | "cancel";
