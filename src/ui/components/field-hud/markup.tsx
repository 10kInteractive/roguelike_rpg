import { useFieldHud } from "./controller";
import "./styles.css";

/** Level, HP, and MP. Hidden until a run has started. */
export function FieldHud() {
  const view = useFieldHud();
  if (!view) return null;
  return <p className="hud-stats">{view.line}</p>;
}
