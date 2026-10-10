import type { Texture } from "three";
import type { Terrain } from "../../../sim/field/map.types";

/** Where a fight happens. Grass and path share the meadow backdrop. */
export type FightTerrain = "grass" | "forest" | "path";

/**
 * Textures the field and a fight backdrop can ask for.
 *
 * Field terrains, the brown earth around the meadow, and the forest fight's floor and trees.
 */
export type BackdropTextures = Partial<Record<Terrain, Texture>> & {
  /** Dark brown earth around the meadow. */
  skirt?: Texture;
  /** Dark brown for a forest fight's floor. */
  forestFloor?: Texture;
  /** Dark green for a forest fight's trees. */
  forestWall?: Texture;
};
