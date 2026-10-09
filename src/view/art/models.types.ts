/** Which six blocks a placeholder is built from. */
export type ModelShape = "person" | "blob" | "moth";

/** How a placeholder looks: six blocks, in one of the shapes, with a mark on the side it faces. */
export type ModelLook = {
  /** Body color. */
  color: number;
  /** The face mark, so facing shows. Eyes, a nose, or antennae. */
  noseColor: number;
  /** Body width and depth, in tiles. */
  width: number;
  /** Body height, in tiles. */
  height: number;
  /** How far the whole figure floats above the ground, in tiles. Defaults to 0. */
  hover?: number;
  /** How the six blocks are arranged. Defaults to a person. */
  shape?: ModelShape;
};
