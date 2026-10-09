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
 * One per page. The command window reads its own key presses while it is open.
 */
export class KeyboardController {
  /** Codes currently held. */
  private readonly held = new Set<string>();

  /** Starts listening. Call once for the page. */
  constructor() {
    window.addEventListener("keydown", (event) => this.press(event));
    window.addEventListener("keyup", (event) => this.held.delete(event.code));
    window.addEventListener("blur", () => this.held.clear());
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
