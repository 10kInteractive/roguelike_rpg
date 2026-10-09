import type { ModelLook } from "./models.types";

/** The placeholder hero: a gold block. */
export const heroLook: ModelLook = {
  color: 0xc4a35a,
  noseColor: 0xf2e6c4,
  width: 0.45,
  height: 0.7,
};

/** Each mob's placeholder block, by mob id. */
export const mobLooks: Record<string, ModelLook> = {
  "mob.slime": { color: 0x6cc04a, noseColor: 0xd8f5c8, width: 0.6, height: 0.4 },
  "mob.ember_imp": { color: 0xe0662a, noseColor: 0xffd27a, width: 0.4, height: 0.65 },
  "mob.frost_moth": { color: 0xa8d8f0, noseColor: 0xffffff, width: 0.6, height: 0.3, hover: 0.5 },
  "mob.rust_sentinel": { color: 0xa0482c, noseColor: 0xe0b090, width: 0.9, height: 1.4 },
};

/** A mob with no look of its own: a gray block, so it still shows. */
export const unknownMobLook: ModelLook = {
  color: 0x888888,
  noseColor: 0xcccccc,
  width: 0.5,
  height: 0.6,
};
