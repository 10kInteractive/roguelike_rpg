import { useEffect, useRef, useState } from "react";
import { debugLog } from "../../../debug/logger.controller";
import { debugWatches } from "../../../debug/watch.controller";
import { gamepad } from "../../../input/gamepad.controller";
import type { MenuDirection } from "../../../input/gamepad.types";
import { uiStore } from "../../store.controller";
import type { PauseChoice, PauseView } from "./types";

const log = debugLog.create("ui:pause");

const rows: readonly { choice: PauseChoice; label: string }[] = [
  { choice: "resume", label: "Resume" },
  { choice: "restart", label: "Restart" },
  { choice: "launcher", label: "Launcher" },
];

/**
 * The pause screen: Resume, Restart, and Launcher.
 *
 * Escape or Start opens it, and either one closes it. While it is open the
 * render loop stops stepping, and Restart leaves the run for a new seed.
 * One per page.
 */
export class PauseController {
  /** True while the screen is up. */
  private open = false;

  /** The highlighted row. */
  private index = 0;

  /** Redraws the screen after a press. */
  private onChange: () => void = () => {};

  /** Runs that want to know Restart was chosen. */
  private readonly restartListeners = new Set<() => void>();

  /** Restart was chosen before a run was listening. */
  private restartQueued = false;

  /** Remembers who redraws. The hook calls this once. */
  bind(onChange: () => void): void {
    this.onChange = onChange;
  }

  /** True while the field and the fight should hold still. */
  isOpen(): boolean {
    return this.open;
  }

  /** The screen, or null while the run is going. */
  view(): PauseView | null {
    if (!this.open) return null;
    return {
      title: "Roguelike RPG",
      subtitle: "if dragon warrior was a procedural roguelike",
      rows: rows.map((row, index) => this.rowView(row.label, index)),
    };
  }

  /**
   * Moves the cursor, or confirms the highlighted row.
   * Ignored while the screen is closed.
   */
  apply(action: MenuDirection): void {
    if (!this.open) return;
    if (action === "up") this.index = (this.index + rows.length - 1) % rows.length;
    if (action === "down") this.index = (this.index + 1) % rows.length;
    if (action === "cancel") this.close();
    if (action === "confirm") this.choose();
    this.onChange();
  }

  /** Opens the screen, or closes it when it is already open. */
  toggle(): void {
    if (this.open) this.close();
    else this.openMenu();
  }

  /**
   * Resolves with the work, or null when Restart is chosen first.
   *
   * @param work The walk or the fight that pause can interrupt.
   */
  race<T>(work: Promise<T>): Promise<T | null> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value: T | null) => {
        if (settled) return;
        settled = true;
        stop();
        resolve(value);
      };
      let stop = () => {};
      stop = this.onRestart(() => finish(null));
      work.then(
        (value) => finish(value),
        () => finish(null),
      );
    });
  }

  /**
   * Calls `listener` when Restart is chosen. A choice that arrived first still counts.
   *
   * @returns Stops the listener.
   */
  onRestart(listener: () => void): () => void {
    if (this.restartQueued) {
      this.restartQueued = false;
      listener();
      return () => {};
    }
    this.restartListeners.add(listener);
    return () => {
      this.restartListeners.delete(listener);
    };
  }

  /** Listens for Escape and Start until the caller stops it. */
  listen(): () => void {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        this.toggle();
        return;
      }
      if (!this.open) return;
      const action = this.direction(event.code);
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      this.apply(action);
    };
    const stopStart = gamepad.onStart(() => this.toggle());
    const stopPad = gamepad.onMenu((action) => {
      if (this.open) this.apply(action);
    });
    window.addEventListener("keydown", onKey, true);
    if (import.meta.env.DEV) debugWatches.watch("paused", () => this.open);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      stopStart();
      stopPad();
    };
  }

  /** Opens on Resume and holds the play clock. */
  private openMenu(): void {
    this.open = true;
    this.index = 0;
    uiStore.holdClock();
    this.onChange();
    log("paused");
  }

  /** Closes the screen and lets the clock run again. */
  private close(): void {
    if (!this.open) return;
    this.open = false;
    uiStore.releaseClock();
    this.onChange();
    log("resumed");
  }

  /** The highlighted row: resume, a new seed, or the launcher. */
  private choose(): void {
    const choice = rows[this.index]?.choice ?? "resume";
    this.close();
    if (choice === "resume") return;
    if (choice === "restart") {
      log("restart");
      this.fireRestart();
      return;
    }
    log("launcher");
    if (typeof window === "undefined") return;
    window.location.assign(new URL("../../index.html", window.location.href).href);
  }

  /** Tells the running loop, or the ending screen, to start a new seed. */
  private fireRestart(): void {
    uiStore.resetClock();
    const listeners = [...this.restartListeners];
    if (listeners.length > 0) {
      for (const listener of listeners) listener();
      return;
    }
    const mode = uiStore.snapshot()?.mode;
    if (mode === "victory" || mode === "gameOver") {
      uiStore.confirmRestart();
      return;
    }
    this.restartQueued = true;
  }

  /** One row with its cursor and its classes. */
  private rowView(label: string, index: number): PauseView["rows"][number] {
    const selected = index === this.index;
    return {
      key: rows[index]?.choice ?? label,
      label,
      cursor: selected ? "▸" : " ",
      className: selected ? "pause-row selected" : "pause-row",
    };
  }

  /** The menu press for a key, or null when the pause screen ignores it. */
  private direction(code: string): MenuDirection | null {
    if (code === "ArrowUp" || code === "KeyW") return "up";
    if (code === "ArrowDown" || code === "KeyS") return "down";
    if (code === "Backspace" || code === "KeyX" || code === "ArrowLeft" || code === "KeyA") {
      return "cancel";
    }
    if (
      code === "Enter" ||
      code === "Space" ||
      code === "KeyZ" ||
      code === "ArrowRight" ||
      code === "KeyD"
    ) {
      return "confirm";
    }
    return null;
  }
}

/** The page's one pause screen. */
export const pause = new PauseController();

/** The pause screen, or null while the run is going. */
export function usePause(): PauseView | null {
  const [, redraw] = useState(0);
  const screen = useRef(pause);
  screen.current.bind(() => redraw((tick) => tick + 1));
  useEffect(() => pause.listen(), []);
  return screen.current.view();
}
