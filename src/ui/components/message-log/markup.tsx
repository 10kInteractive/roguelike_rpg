import { useMessageLogView } from "./controller";
import "./styles.css";

/** The latest lines, oldest at the top. Hidden until something has happened. */
export function MessageLog() {
  const view = useMessageLogView();
  if (!view) return null;
  return <div className="message-log">{view.text}</div>;
}
