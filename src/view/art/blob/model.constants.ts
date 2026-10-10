import type { ModelLook } from "../models.types";

/** The slime: a green blob. */
export const slimeLook: ModelLook = {
  color: 0x6cc04a,
  noseColor: 0xd8f5c8,
  width: 0.6,
  height: 0.4,
  shape: "blob",
};

/** Blob looks keyed by mob id. */
export const blobLooks: Record<string, ModelLook> = {
  "mob.slime": slimeLook,
};
