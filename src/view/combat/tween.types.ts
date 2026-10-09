/** One running animation: how long it lasts, how far along it is, and what it moves. */
export type Tween = {
  /** Total length, in seconds. */
  duration: number;
  /** Seconds run so far. */
  elapsed: number;
  /** Called each frame with progress from 0 to 1. Called with exactly 1 at the end. */
  step: (progress: number) => void;
  /** Settles the promise `run` returned. */
  finish: () => void;
};
