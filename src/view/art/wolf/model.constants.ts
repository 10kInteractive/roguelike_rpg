import type { ModelLook } from "../models.types";

/** The dire wolf: a low gray wolf. Forest only. */
export const direWolfLook: ModelLook = {
  color: 0x5c5348,
  noseColor: 0xd8d0c4,
  width: 0.55,
  height: 0.48,
  shape: "wolf",
};

/** Wolf looks keyed by mob id. */
export const wolfLooks: Record<string, ModelLook> = {
  "mob.dire_wolf": direWolfLook,
};
