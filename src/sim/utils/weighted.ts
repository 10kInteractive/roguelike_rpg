import type { Weighted } from "./weighted.types";

/**
 * Picks one entry from a weighted list.
 *
 * `roll` is in [0, 1). It is multiplied by the total weight, then the list is
 * walked in order. Each entry covers a slice of its weight. A roll on a
 * boundary belongs to the next entry. Every weight must be above zero.
 */
export function pickWeighted<T extends Weighted>(options: readonly T[], roll: number): T {
  if (options.length === 0) {
    throw new Error("A weighted list needs at least one entry");
  }
  let total = 0;
  for (const option of options) {
    if (option.weight <= 0) {
      throw new Error("Weight must be above zero");
    }
    total += option.weight;
  }
  let cursor = roll * total;
  for (const option of options) {
    if (cursor < option.weight) return option;
    cursor -= option.weight;
  }
  const last = options[options.length - 1];
  if (!last) {
    throw new Error("A weighted list needs at least one entry");
  }
  return last;
}
