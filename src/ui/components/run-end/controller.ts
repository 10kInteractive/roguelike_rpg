import { useEffect, useRef } from "react";
import { gamepad } from "../../../input/gamepad.controller";
import type { Snapshot } from "../../../sim/game.types";
import { nameFromId } from "../../names";
import { uiStore, usePlayMs, useUiSnapshot } from "../../store.controller";
import type { RunEndView } from "./types";

/** Victory or game over: the run's stats, and a confirm that starts a new seed. */
export class RunEndController {
  /** The snapshot the panel was last built from. */
  private snapshot: Snapshot | null = null;

  /** The panel's text, or null while a run is going. */
  show(snapshot: Snapshot | null, playMs: number | null): RunEndView | null {
    this.snapshot = snapshot;
    if (!this.snapshot || !this.ended(this.snapshot.mode)) return null;
    return { text: this.panel(this.snapshot, playMs ?? 0) };
  }

  /** Listens for confirm until the caller stops it. */
  listen(): () => void {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || !this.confirms(event.code)) return;
      event.preventDefault();
      uiStore.confirmRestart();
    };
    const stopPad = gamepad.onMenu((action) => {
      if (action === "confirm") uiStore.confirmRestart();
    });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      stopPad();
    };
  }

  /** The run is on the victory or game over screen. */
  private ended(mode: Snapshot["mode"]): boolean {
    return mode === "victory" || mode === "gameOver";
  }

  /** Enter, Space, or Z starts the next run. The same keys that confirm a command. */
  private confirms(code: string): boolean {
    return (
      code === "Enter" ||
      code === "Space" ||
      code === "KeyZ" ||
      code === "ArrowRight" ||
      code === "KeyD"
    );
  }

  /** The outcome, the scoreboard, and how to go again. */
  private panel(snapshot: Snapshot, playMs: number): string {
    const stats = snapshot.stats;
    const rows: [string, string][] = [
      ["Time", this.clock(playMs)],
      ["Fights won", String(stats.fightsWon)],
      ["Fights fled", String(stats.fightsFled)],
      ["Level", String(stats.level)],
      ["Damage dealt", String(stats.damageDealt)],
      ["Damage taken", String(stats.damageTaken)],
      ["Potions used", String(stats.potionsUsed)],
      ["Distance", stats.distance.toFixed(1)],
      ["Seed", String(stats.seed)],
    ];
    const width = Math.max(...rows.map(([label]) => label.length));
    const body = rows.map(([label, value]) => `${label.padEnd(width)}  ${value}`).join("\n");
    const title = snapshot.mode === "victory" ? "Victory" : "Game Over";
    const killed =
      snapshot.mode === "gameOver" && stats.killedBy
        ? `\nDefeated by ${nameFromId(stats.killedBy)}\n`
        : "\n";
    return `${title}${killed}\n${body}\n\nA or Enter to restart`;
  }

  /** `playMs` as `m:ss`. */
  private clock(playMs: number): string {
    const total = Math.max(0, Math.floor(playMs / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}

/** The ending panel. Null while a run is going. */
export function useRunEnd(): RunEndView | null {
  const snapshot = useUiSnapshot();
  const playMs = usePlayMs();
  const controller = useRef(new RunEndController());
  const view = controller.current.show(snapshot, playMs);
  const ended = view !== null;

  useEffect(() => {
    if (!ended) return;
    return controller.current.listen();
  }, [ended]);

  return view;
}
