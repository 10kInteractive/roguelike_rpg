import type { Stick } from "../sim/field/movement.types";
import { stickFromHeld } from "./keyboard";

/** Keys that walk the hero. The page should not scroll for these. */
const moveCodes = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
]);

/**
 * The keys held right now, as a stick the field can step with.
 *
 * One walk at a time. The command window reads its own key presses while it is open.
 */
export class KeyboardController {
  /** Codes currently held. */
  private readonly held = new Set<string>();

  /** Remembers a move key. */
  private readonly onKeyDown = (event: KeyboardEvent) => this.press(event);

  /** Forgets a move key. */
  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.held.delete(event.code);
  };

  /** A lost window holds nothing. */
  private readonly onBlur = () => {
    this.held.clear();
  };

  /** Starts listening. One walk at a time; `stop` before the next run. */
  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  /** Stops listening, so the next run can take the keys. */
  stop(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.held.clear();
  }

  /** The stick for the keys held now. No keys is a still stick. */
  stick(): Stick {
    return stickFromHeld([...this.held]);
  }

  /** Remembers a move key and keeps the page from scrolling. */
  private press(event: KeyboardEvent): void {
    if (!moveCodes.has(event.code)) return;
    event.preventDefault();
    this.held.add(event.code);
  }
}
