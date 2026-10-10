import { tickRate } from "./movement.constants";

/** How long random fights wait when a run starts. */
export const openingGuardSeconds = 5;

/** How long random fights wait after a won pack sends the hero back to the meadow. */
export const returnGuardSeconds = 2.5;

/** The opening hold, in field ticks. */
export const openingGuardTicks = openingGuardSeconds * tickRate;

/** The hold after a won pack, in field ticks. */
export const returnGuardTicks = returnGuardSeconds * tickRate;
