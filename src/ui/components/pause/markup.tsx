import { usePause } from "./controller";
import "./styles.css";

/** The pause screen. Hidden while the run is going. */
export function PauseScreen() {
  const view = usePause();
  if (!view) return null;
  return (
    <div className="pause">
      <div className="pause-panel">
        <h1 className="pause-title">{view.title}</h1>
        <p className="pause-subtitle">{view.subtitle}</p>
        {view.rows.map((row) => (
          <div key={row.key} className={row.className}>
            {row.cursor} {row.label}
          </div>
        ))}
      </div>
    </div>
  );
}
