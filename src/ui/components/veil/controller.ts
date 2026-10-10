import { useRef, useState } from "react";
import type { VeilView } from "./types";

/** How long the curtain takes to finish if the browser never reports the fade. */
const veilFallbackMs = 800;

/**
 * The black curtain between the meadow and a fight.
 *
 * Cover fades the screen to black. Reveal fades it back. The game swaps
 * scenes while the curtain is down. One per page.
 */
export class VeilController {
  /** True while the curtain should be black. */
  private covered = false;

  /** Redraws the curtain after it is asked to move. */
  private onChange: () => void = () => {};

  /** Remembers who redraws. The hook calls this once. */
  bind(onChange: () => void): void {
    this.onChange = onChange;
  }

  /** True while the curtain is black or on its way there. */
  isCovered(): boolean {
    return this.covered;
  }

  /** The curtain, ready to draw. */
  view(): VeilView {
    return { className: this.covered ? "veil covered" : "veil" };
  }

  /** Fades the screen to black. */
  async cover(): Promise<void> {
    if (this.covered) return;
    this.covered = true;
    this.onChange();
    await this.afterFade();
  }

  /** Fades the screen back in. */
  async reveal(): Promise<void> {
    if (!this.covered) return;
    this.covered = false;
    this.onChange();
    await this.afterFade();
  }

  /** Resolves when the fade finishes, or immediately when there is no curtain. */
  private afterFade(): Promise<void> {
    if (typeof document === "undefined") return Promise.resolve();
    return new Promise((resolve) => {
      const arm = () => {
        const node = document.querySelector(".veil");
        if (!node) {
          resolve();
          return;
        }
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          node.removeEventListener("transitionend", onEnd);
          resolve();
        };
        const onEnd = (event: Event) => {
          if (event.target === node) finish();
        };
        node.addEventListener("transitionend", onEnd);
        window.setTimeout(finish, veilFallbackMs);
      };
      if (typeof requestAnimationFrame !== "function") {
        arm();
        return;
      }
      requestAnimationFrame(() => requestAnimationFrame(arm));
    });
  }
}

/** The page's one curtain. */
export const veil = new VeilController();

/** The curtain's class. */
export function useVeil(): VeilView {
  const [, redraw] = useState(0);
  const screen = useRef(veil);
  screen.current.bind(() => redraw((tick) => tick + 1));
  return screen.current.view();
}
