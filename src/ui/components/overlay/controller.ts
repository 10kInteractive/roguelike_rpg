import { useRef } from "react";
import type { Snapshot } from "../../../sim/game.types";
import { useUiSnapshot } from "../../store.controller";
import type { OverlayView } from "./types";

/** Chooses the panels: the ending screen, or the field and the command window. */
export class OverlayController {
  /** The mode the choice was last made from. */
  private mode: Snapshot["mode"] | null = null;

  /** The ending screen replaces the field panels once the run is over. */
  show(mode: Snapshot["mode"] | undefined): OverlayView {
    this.mode = mode ?? null;
    return { ended: this.mode === "victory" || this.mode === "gameOver" };
  }
}

/** Whether the ending screen is up. */
export function useOverlay(): OverlayView {
  const mode = useUiSnapshot()?.mode;
  const controller = useRef(new OverlayController());
  return controller.current.show(mode);
}
