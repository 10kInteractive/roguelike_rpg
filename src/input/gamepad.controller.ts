import { debugLog } from "../debug/logger.controller";
import { debugWatches } from "../debug/watch.controller";
import type { Stick } from "../sim/field/movement.types";
import { menuHeld, menuPresses, stickFromPad } from "./gamepad";
import {
  cancelButton,
  confirmButton,
  downButton,
  leftButton,
  rightButton,
  upButton,
} from "./gamepad.constants";
import type { MenuDirection, PadReading } from "./gamepad.types";

const log = debugLog.create("input");

const quiet: Record<MenuDirection, boolean> = {
  up: false,
  down: false,
  confirm: false,
  cancel: false,
};

/**
 * The connected pad, as a stick for walking and presses for menus.
 *
 * One per page. It polls the browser's pads, because a pad has no key events.
 * A menu direction already held when a listener starts does not fire until it is released.
 */
export class GamepadController {
  /** Menus waiting for a press. */
  private readonly listeners = new Set<(action: MenuDirection) => void>();

  /** The stick from the latest sample. */
  private stickNow: Stick = { x: 0, y: 0 };

  /** Menu directions held on the latest sample. */
  private held: Record<MenuDirection, boolean> = { ...quiet };

  /** What the dev panel shows. */
  private label = "none";

  /** The poll loop. Zero before it starts. */
  private raf = 0;

  /** Starts polling when this is a browser. */
  constructor() {
    if (typeof window === "undefined") return;
    window.addEventListener("gamepadconnected", (event) => {
      log(event.gamepad.id);
    });
    this.poll();
    const loop = () => {
      this.poll();
      this.raf = window.requestAnimationFrame(loop);
    };
    this.raf = window.requestAnimationFrame(loop);
    if (import.meta.env.DEV) debugWatches.watch("pad", () => this.label);
  }

  /** The stick right now. Still when no pad is connected. */
  stick(): Stick {
    return this.stickNow;
  }

  /**
   * Calls `listener` for each new menu press.
   *
   * @returns Stops the listener.
   */
  onMenu(listener: (action: MenuDirection) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Stops polling. */
  stop(): void {
    if (this.raf === 0 || typeof window === "undefined") return;
    window.cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Reads the pad and tells menus about directions that just became held. */
  private poll(): void {
    const pad = this.connected();
    if (!pad) {
      this.stickNow = { x: 0, y: 0 };
      this.held = { ...quiet };
      this.label = "none";
      return;
    }

    const reading = this.reading(pad);
    this.stickNow = stickFromPad(reading);
    const next = menuHeld(reading);
    for (const action of menuPresses(this.held, next)) {
      for (const listener of this.listeners) listener(action);
    }
    this.held = next;
    this.label = `${this.shortName(pad.id)} ${this.stickNow.x},${this.stickNow.y}`;
  }

  /** The first standard-mapping pad, or the first pad connected. */
  private connected(): Gamepad | null {
    const pads = navigator.getGamepads?.() ?? [];
    let fallback: Gamepad | null = null;
    for (const pad of pads) {
      if (!pad?.connected) continue;
      if (pad.mapping === "standard") return pad;
      fallback ??= pad;
    }
    return fallback;
  }

  /** Buttons and the left stick from one pad. */
  private reading(pad: Gamepad): PadReading {
    return {
      axisX: pad.axes[0] ?? 0,
      axisY: pad.axes[1] ?? 0,
      confirm: this.pressed(pad, confirmButton),
      cancel: this.pressed(pad, cancelButton),
      up: this.pressed(pad, upButton),
      down: this.pressed(pad, downButton),
      left: this.pressed(pad, leftButton),
      right: this.pressed(pad, rightButton),
    };
  }

  /** A button is down when the browser says so, or its analog value passes a half press. */
  private pressed(pad: Gamepad, index: number): boolean {
    const button = pad.buttons[index];
    return button !== undefined && (button.pressed || button.value > 0.5);
  }

  /** The pad's name, without the parenthetical the browser appends. */
  private shortName(id: string): string {
    const name = id.split("(")[0]?.trim();
    return name || id;
  }
}

/** The page's one pad. */
export const gamepad = new GamepadController();
