/** The meadow behind a fight: a grass floor, bushes, a tree line, then mountains. */
export const meadowBackdrop = {
  /** Width and depth of the grass floor. */
  floorSize: 40,
  /** Low bushes in front of the tree line, clear of the pack and the hero. */
  bushes: [
    { x: -7, z: -2.4, height: 0.55 },
    { x: -4.6, z: -2.1, height: 0.7 },
    { x: 4.4, z: -2.2, height: 0.65 },
    { x: 6.8, z: -2.6, height: 0.5 },
    { x: 8.2, z: -1.8, height: 0.75 },
  ],
  /** Rocks on the near ground, off to either side of the fighters. */
  near: [
    { x: -3.4, z: 1.85, width: 0.9, height: 0.5, depth: 0.75, kind: "rock" },
    { x: 3.15, z: 1.75, width: 1.15, height: 0.65, depth: 0.9, kind: "rock" },
  ],
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
