import { useCommandWindow } from "./controller";
import "./styles.css";

/** Fight, Magic, Item, Defend, and Run, and the menus those open. Hidden until the hero's turn. */
export function CommandWindow() {
  const view = useCommandWindow();
  if (!view) return null;

  return (
    <div className="command-window">
      {view.rows.map((row) => (
        <div key={row.label} className={row.className}>
          {row.cursor} {row.label}
        </div>
      ))}
    </div>
  );
}
