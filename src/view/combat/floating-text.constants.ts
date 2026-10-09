/** How a floating number looks and moves: canvas size, world size, rise, and timing. */
export const floatingTextLook = {
  /** Canvas pixels the text is drawn into. */
  canvas: { width: 128, height: 64 },
  /** Font for the canvas. Bold and chunky, to read over the meadow. */
  font: "bold 44px monospace",
  /** Outline width, in canvas pixels, so the text reads on any background. */
  outline: 8,
  /** Sprite size in the scene, in tiles. */
  size: { width: 0.9, height: 0.45 },
  /** How far it rises, in tiles. */
  rise: 0.6,
  /** Seconds from appearing to gone. */
  seconds: 0.9,
};

/** Floating text colors by what happened. */
export const floatingTextColors = {
  damage: "#ffffff",
  critical: "#ffd23f",
  heal: "#7dff8a",
  level: "#ffd23f",
  xp: "#9fd8ff",
};
