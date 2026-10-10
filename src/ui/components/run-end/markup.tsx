import { useRunEnd } from "./controller";
import "./styles.css";

/** Victory or game over. Hidden while a run is going. */
export function RunEndScreen() {
  const view = useRunEnd();
  if (!view) return null;
  return <div className="run-end">{view.text}</div>;
}
