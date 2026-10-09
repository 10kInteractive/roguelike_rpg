/** A source of rolls in [0, 1). A run uses `SeededRandomGenerator`. Tests may pass a fixed list. */
export type Rng = {
  /** The next value in [0, 1). Each call advances the source. */
  next(): number;
};
