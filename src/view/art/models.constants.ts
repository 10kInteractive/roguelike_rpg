import { blobLooks } from "./blob/model.constants";
import type { ModelLook } from "./models.types";
import { mothLooks } from "./moth/model.constants";
import { heroLook, personLooks, unknownMobLook } from "./person/model.constants";
import { wolfLooks } from "./wolf/model.constants";

export { heroLook, unknownMobLook };

/** Each mob's placeholder, by mob id. The numbers live beside that mob's shape. */
export const mobLooks: Record<string, ModelLook> = {
  ...blobLooks,
  ...personLooks,
  ...mothLooks,
  ...wolfLooks,
};
