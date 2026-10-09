/** How a placeholder block model looks: a colored body with a nose on the side it faces. */
export type ModelLook = {
  /** Body color. */
  color: number;
  /** Nose color, so facing shows. */
  noseColor: number;
  /** Body width and depth, in tiles. */
  width: number;
  /** Body height, in tiles. */
  height: number;
  /** How far the body floats above the ground, in tiles. Defaults to 0. */
  hover?: number;
};
