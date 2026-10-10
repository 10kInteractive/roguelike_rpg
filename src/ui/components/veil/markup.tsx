import { useVeil } from "./controller";
import "./styles.css";

/** The black curtain. Clear while the meadow or a fight is on screen. */
export function VeilScreen() {
  const view = useVeil();
  return <div className={view.className} />;
}
