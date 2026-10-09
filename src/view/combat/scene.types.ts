import type { Group } from "three";

/** One model on the combat stage and where it stands when idle. */
export type StagedActor = {
  /** The placeholder model. */
  model: Group;
  /** Its spot on the ground, before any step out. */
  home: { x: number; z: number };
  /** How far it bobs. Hovering mobs bob more. */
  bob: number;
  /** Offsets this actor's bob so the line does not move in step. */
  phase: number;
};
