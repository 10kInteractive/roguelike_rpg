import { useEffect } from "react";
import { gamepad } from "../../input/gamepad.controller";
import type { Snapshot } from "../../sim/game.types";
import { nameFromId } from "../names";
import { uiStore, usePlayMs, useUiSnapshot } from "../store.controller";

/** Victory or game over: the run's stats, and a confirm that starts a new seed. */
export function RunEndScreen() {
  const snapshot = useUiSnapshot();
  const playMs = usePlayMs();
  const ended = snapshot?.mode === "victory" || snapshot?.mode === "gameOver";

  useEffect(() => {
    if (!ended) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || !isConfirm(event.code)) return;
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
  }, [ended]);

  if (!ended || !snapshot) return null;
  return <div className="run-end">{panel(snapshot, playMs ?? 0)}</div>;
}

/** Enter, Space, or Z starts the next run. The same keys that confirm a command. */
function isConfirm(code: string): boolean {
  return (
    code === "Enter" ||
    code === "Space" ||
    code === "KeyZ" ||
    code === "ArrowRight" ||
    code === "KeyD"
  );
}

/** The panel's text: the outcome, the scoreboard, and how to go again. */
function panel(snapshot: Snapshot, playMs: number): string {
  const stats = snapshot.stats;
  const rows: [string, string][] = [
    ["Time", clock(playMs)],
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
  return `${title}${killed}\n${body}\n\nEnter to restart`;
}

/** `playMs` as `m:ss`. */
function clock(playMs: number): string {
  const total = Math.max(0, Math.floor(playMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
