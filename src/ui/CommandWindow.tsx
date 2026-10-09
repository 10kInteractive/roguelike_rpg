import { useEffect, useState } from "react";
import type { CommandRow } from "./commands";
import { uiStore, useCommands } from "./store.controller";

/** Fight, Magic, Item, Defend, and Run. Hidden until the hero's turn. */
export function CommandWindow() {
  const rows = useCommands();
  if (!rows) return null;
  return <CommandList rows={rows} />;
}

/** The open window. It mounts fresh each turn, so the cursor starts on Fight. */
function CommandList({ rows }: { rows: readonly CommandRow[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "ArrowUp" || event.code === "KeyW") {
        event.preventDefault();
        setIndex((current) => (current + rows.length - 1) % rows.length);
        return;
      }
      if (event.code === "ArrowDown" || event.code === "KeyS") {
        event.preventDefault();
        setIndex((current) => (current + 1) % rows.length);
        return;
      }
      if (event.code !== "Enter" && event.code !== "Space" && event.code !== "KeyZ") return;
      event.preventDefault();
      const action = rows[index]?.action;
      if (action) uiStore.submit(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, index]);

  return (
    <div className="command-window">
      {rows.map((row, rowIndex) => (
        <div key={row.label} className={rowClass(rowIndex === index, row.action === null)}>
          {rowIndex === index ? "▸" : " "} {row.label}
        </div>
      ))}
    </div>
  );
}

/** The selected row is marked. A command that cannot be used is dimmed. */
function rowClass(selected: boolean, unavailable: boolean): string {
  const names = ["command-row"];
  if (selected) names.push("selected");
  if (unavailable) names.push("unavailable");
  return names.join(" ");
}
