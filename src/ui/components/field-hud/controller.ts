import { useRef } from "react";
import type { Snapshot } from "../../../sim/game.types";
import { useUiSnapshot } from "../../store.controller";
import type { FieldHudView } from "./types";

/** Level, HP, and MP from the latest snapshot. */
export class FieldHudController {
  /** The hero the line was last built from. Null before a run starts. */
  private hero: Snapshot["hero"] | null = null;

  /** The line for this hero, or null before a run starts. */
  show(hero: Snapshot["hero"] | null): FieldHudView | null {
    this.hero = hero;
    if (!this.hero) return null;
    return {
      line: `LV ${this.hero.level} · HP ${this.hero.hp}/${this.hero.maxHp} · MP ${this.hero.mp}/${this.hero.maxMp}`,
    };
  }
}

/** The hero's points. Null before a run starts. */
export function useFieldHud(): FieldHudView | null {
  const snapshot = useUiSnapshot();
  const controller = useRef(new FieldHudController());
  return controller.current.show(snapshot?.hero ?? null);
}
