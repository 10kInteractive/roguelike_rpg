import type { ModelLook } from "../models.types";

/** The frost moth: a pale moth that hovers. */
export const frostMothLook: ModelLook = {
  color: 0xa8d8f0,
  noseColor: 0xffffff,
  width: 0.6,
  height: 0.3,
  hover: 0.5,
  shape: "moth",
};

/** Moth looks keyed by mob id. */
export const mothLooks: Record<string, ModelLook> = {
  "mob.frost_moth": frostMothLook,
};
