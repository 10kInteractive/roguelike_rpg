import { useEffect, useState } from "react";
import type { MenuRow } from "../commands";
import { rowUsable } from "../commands";
import { uiStore, useCommands } from "../store.controller";

/** Fight, Magic, Item, Defend, and Run, and the menus those open. Hidden until the hero's turn. */
export function CommandWindow() {
  const rows = useCommands();
  if (!rows) return null;
  return <CommandMenus rows={rows} />;
}

/** One menu deep. The root mounts fresh each turn, so the cursor starts on Fight. */
function CommandMenus({ rows }: { rows: readonly MenuRow[] }) {
  const [menus, setMenus] = useState<readonly MenuFrame[]>([{ rows, index: 0 }]);
  const menu = menus[menus.length - 1] ?? { rows, index: 0 };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (isUp(event.code)) {
        event.preventDefault();
        setMenus(move(-1));
        return;
      }
      if (isDown(event.code)) {
        event.preventDefault();
        setMenus(move(1));
        return;
      }
      if (isCancel(event.code)) {
        event.preventDefault();
        setMenus(back);
        return;
      }
      if (!isConfirm(event.code)) return;
      event.preventDefault();
      const row = menu.rows[menu.index];
      if (row?.menu && row.menu.length > 0) {
        setMenus((current) => [...current, { rows: row.menu ?? [], index: 0 }]);
        return;
      }
      if (row?.action) uiStore.submit(row.action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  return (
    <div className="command-window">
      {menu.rows.map((row, rowIndex) => (
        <div key={row.label} className={rowClass(rowIndex === menu.index, !rowUsable(row))}>
          {rowIndex === menu.index ? "▸" : " "} {row.label}
        </div>
      ))}
    </div>
  );
}

/** The rows on screen, and which one the cursor is on. */
type MenuFrame = {
  rows: readonly MenuRow[];
  index: number;
};

/** Moves the cursor on the open menu, wrapping at the ends. */
function move(step: number): (menus: readonly MenuFrame[]) => MenuFrame[] {
  return (menus) => {
    const open = menus[menus.length - 1];
    if (!open || open.rows.length === 0) return [...menus];
    const index = (open.index + step + open.rows.length) % open.rows.length;
    return [...menus.slice(0, -1), { rows: open.rows, index }];
  };
}

/** Closes the open menu. The root stays, and its cursor stays where it was. */
function back(menus: readonly MenuFrame[]): MenuFrame[] {
  if (menus.length <= 1) return [...menus];
  return menus.slice(0, -1);
}

/** Up the menu. */
function isUp(code: string): boolean {
  return code === "ArrowUp" || code === "KeyW";
}

/** Down the menu. */
function isDown(code: string): boolean {
  return code === "ArrowDown" || code === "KeyS";
}

/** Opens the row, or sends its action. */
function isConfirm(code: string): boolean {
  return (
    code === "Enter" ||
    code === "Space" ||
    code === "KeyZ" ||
    code === "ArrowRight" ||
    code === "KeyD"
  );
}

/** Returns to the menu that opened this one. */
function isCancel(code: string): boolean {
  return (
    code === "Escape" ||
    code === "Backspace" ||
    code === "KeyX" ||
    code === "ArrowLeft" ||
    code === "KeyA"
  );
}

/** The selected row is marked. A command that cannot be used is dimmed. */
function rowClass(selected: boolean, unavailable: boolean): string {
  const names = ["command-row"];
  if (selected) names.push("selected");
  if (unavailable) names.push("unavailable");
  return names.join(" ");
}
