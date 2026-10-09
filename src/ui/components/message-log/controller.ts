import { useRef } from "react";
import { useMessageLog } from "../../store.controller";
import type { MessageLogView } from "./types";

/** The latest lines, oldest at the top. */
export class MessageLogController {
  /** The lines last shown. */
  private lines: readonly string[] = [];

  /** The log as one block, or null when it is empty. */
  show(lines: readonly string[]): MessageLogView | null {
    this.lines = lines;
    if (this.lines.length === 0) return null;
    return { text: this.lines.join("\n") };
  }
}

/** The lines on the log. Null until something has happened. */
export function useMessageLogView(): MessageLogView | null {
  const lines = useMessageLog();
  const controller = useRef(new MessageLogController());
  return controller.current.show(lines);
}
