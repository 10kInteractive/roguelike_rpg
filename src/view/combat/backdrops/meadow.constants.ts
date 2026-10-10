/** The meadow behind a fight: a grass floor, a tree line, then mountains. */
export const meadowBackdrop = {
  /** Width and depth of the grass floor. */
  floorSize: 40,
  /** The tree line: one forest column per tile, from `from` to `to` along x. */
  trees: { z: -4.5, from: -10, to: 10, height: 0.85 },
  /** The mountain row behind the trees. Heights and depth nudges repeat along the row. */
  mountains: {
    z: -8,
    from: -14,
    to: 14,
    heights: [1.8, 2.4, 2.0, 2.9, 1.9, 2.3, 2.6],
    nudges: [0, -0.6, 0.4, -1, 0.2, -0.4, 0.6, -0.8],
  },
};
