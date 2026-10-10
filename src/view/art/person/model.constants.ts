import type { ModelLook } from "../models.types";

/** The placeholder hero: a gold person of six blocks. */
export const heroLook: ModelLook = {
  color: 0xc4a35a,
  noseColor: 0xf2e6c4,
  width: 0.45,
  height: 0.7,
  shape: "person",
};

/** The ember imp: a small orange person. */
export const emberImpLook: ModelLook = {
  color: 0xe0662a,
  noseColor: 0xffd27a,
  width: 0.4,
  height: 0.65,
  shape: "person",
};

/** The rust sentinel: a tall person. */
export const rustSentinelLook: ModelLook = {
  color: 0xa0482c,
  noseColor: 0xe0b090,
  width: 0.9,
  height: 1.4,
  shape: "person",
};

/** A mob with no look of its own: a gray person, so it still shows. */
export const unknownMobLook: ModelLook = {
  color: 0x888888,
  noseColor: 0xcccccc,
  width: 0.5,
  height: 0.6,
};

/** Person looks keyed by mob id. The hero is not a mob. */
export const personLooks: Record<string, ModelLook> = {
  "mob.ember_imp": emberImpLook,
  "mob.rust_sentinel": rustSentinelLook,
};
