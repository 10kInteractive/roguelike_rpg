import type { Texture } from "three";
import type { Terrain } from "../../../sim/field/map.types";

/** Where a fight happens. Grass and path share the meadow backdrop. */
export type FightTerrain = "grass" | "forest" | "path";

/**
 * Textures a backdrop can ask for. Field terrains, plus the forest fight's floor and trees.
 */
export type BackdropTextures = Partial<Record<Terrain, Texture>> & {
  /** Dark brown for a forest fight's floor. */
  forestFloor?: Texture;
  /** Dark green for a forest fight's trees. */
  forestWall?: Texture;
};
