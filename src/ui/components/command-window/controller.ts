import { useEffect, useRef, useState } from "react";
import { gamepad } from "../../../input/gamepad.controller";
import type { MenuDirection } from "../../../input/gamepad.types";
import type { Action } from "../../../sim/game.types";
import type { MenuRow } from "../../commands";
import { rowUsable } from "../../commands";
import { uiStore, useCommands } from "../../store.controller";
import type { CommandWindowView, MenuFrame } from "./types";

/**
 * The combat menus: Fight, Magic, Item, Defend, and Run, and the menus those open.
 *
 * The root opens fresh each turn, so the cursor starts on Fight. Up and down
 * wrap. Cancel closes the menu that was opened. Confirm opens the next menu,
 * or sends the row's action.
 */
export class CommandWindowController {
  /** The menus that were opened, the root first. */
  private menus: MenuFrame[] = [];

  /** Tells React the cursor or the open menu changed. */
  private readonly onChange: () => void;

  /** @param onChange Tells React the cursor or the open menu changed. */
  constructor(onChange: () => void) {
    this.onChange = onChange;
  }

  /** Opens the root menu with the cursor on the first row. */
  open(rows: readonly MenuRow[]): void {
    this.menus = [{ rows, index: 0 }];
  }

  /** Closes every menu. */
  close(): void {
    this.menus = [];
  }

  /** The open menu, or null while it is closed. */
  view(): CommandWindowView | null {
    const menu = this.menus[this.menus.length - 1];
    if (!menu) return null;
    return {
      rows: menu.rows.map((row, index) => this.rowView(row, index, index === menu.index)),
    };
  }

  /**
   * Applies one menu press.
   *
   * @returns The action confirm chose, or null when the press only moved the cursor.
   */
  apply(action: MenuDirection): Action | null {
    if (action === "up") this.menus = this.moved(-1);
    if (action === "down") this.menus = this.moved(1);
    if (action === "cancel") this.menus = this.back();
    const chosen = action === "confirm" ? this.choose() : null;
    this.onChange();
    return chosen;
  }

  /** Listens to the keyboard and the pad until the caller stops it. */
  listen(): () => void {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const action = this.direction(event.code);
      if (!action) return;
      event.preventDefault();
      const chosen = this.apply(action);
      if (chosen) uiStore.submit(chosen);
    };
    const stopPad = gamepad.onMenu((action) => {
      const chosen = this.apply(action);
      if (chosen) uiStore.submit(chosen);
    });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      stopPad();
    };
  }

  /** One row with its cursor and its classes. */
  private rowView(
    row: MenuRow,
    index: number,
    selected: boolean,
  ): CommandWindowView["rows"][number] {
    const names = ["command-row"];
    if (selected) names.push("selected");
    if (!rowUsable(row)) names.push("unavailable");
    return {
      key: this.rowKey(row, index),
      label: row.label,
      cursor: selected ? "▸" : " ",
      className: names.join(" "),
    };
  }

  /** A key that stays unique when two rows wear the same name. */
  private rowKey(row: MenuRow, index: number): string {
    const action = row.action;
    if (action?.type === "fight") return `${index}:fight:${action.target}`;
    if (action?.type === "cast") return `${index}:cast:${action.spell}:${action.target}`;
    if (action?.type === "item") return `${index}:${action.item}`;
    if (action) return `${index}:${action.type}`;
    return `${index}:${row.label}`;
  }

  /** Moves the cursor on the open menu, wrapping at the ends. */
  private moved(step: number): MenuFrame[] {
    const open = this.menus[this.menus.length - 1];
    if (!open || open.rows.length === 0) return [...this.menus];
    const index = (open.index + step + open.rows.length) % open.rows.length;
    return [...this.menus.slice(0, -1), { rows: open.rows, index }];
  }

  /** Closes the open menu. The root stays, and its cursor stays where it was. */
  private back(): MenuFrame[] {
    if (this.menus.length <= 1) return [...this.menus];
    return this.menus.slice(0, -1);
  }

  /** Opens the row, or returns the action confirm sends. */
  private choose(): Action | null {
    const open = this.menus[this.menus.length - 1];
    const row = open?.rows[open.index];
    if (row?.menu && row.menu.length > 0) {
      this.menus = [...this.menus, { rows: row.menu, index: 0 }];
      return null;
    }
    return row?.action ?? null;
  }

  /** The menu press for a key, or null when the menu ignores it. */
  private direction(code: string): MenuDirection | null {
    if (code === "ArrowUp" || code === "KeyW") return "up";
    if (code === "ArrowDown" || code === "KeyS") return "down";
    if (
      code === "Escape" ||
      code === "Backspace" ||
      code === "KeyX" ||
      code === "ArrowLeft" ||
      code === "KeyA"
    ) {
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

/** The open menu. Null while the hero is not choosing. */
export function useCommandWindow(): CommandWindowView | null {
  const rows = useCommands();
  const [, redraw] = useState(0);
  const controller = useRef<CommandWindowController | null>(null);
  if (controller.current === null) {
    controller.current = new CommandWindowController(() => redraw((tick) => tick + 1));
  }
  const menu = controller.current;

  // A new set of rows is a new turn. The cursor goes back to Fight.
  const shown = useRef<readonly MenuRow[] | null>(null);
  if (rows !== shown.current) {
    shown.current = rows;
    if (rows) menu.open(rows);
    else menu.close();
  }

  useEffect(() => {
    if (!rows) return;
    return menu.listen();
  }, [rows, menu]);

  if (!rows) return null;
  return menu.view();
}
