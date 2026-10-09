/**
 * The longest frame the clock will catch up on, in seconds.
 *
 * A tab that sleeps for a minute would otherwise run 1800 sim steps in one
 * frame. Time past this is dropped, so the game pauses instead of racing.
 */
export const maxFrameSeconds = 0.25;
