import { useMessageLog } from "./store.controller";

/** The latest lines, oldest at the top. Hidden until something has happened. */
export function MessageLog() {
  const lines = useMessageLog();
  if (lines.length === 0) return null;

  return <div className="message-log">{lines.join("\n")}</div>;
}
