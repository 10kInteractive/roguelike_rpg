import type { WatchRow } from "./watch.types";

/**
 * Live values the dev panel shows.
 *
 * Code registers a reader under a label. The panel samples every reader on
 * its own timer, so nothing that changes per frame goes through React.
 */
export class DebugWatchController {
  /** One reader per label. Registering a label again replaces its reader. */
  private readonly readers = new Map<string, () => unknown>();

  /** Shows `read()` on the panel under `label`. */
  watch(label: string, read: () => unknown): void {
    this.readers.set(label, read);
  }

  /** Every watched value right now, in registration order. */
  rows(): WatchRow[] {
    const rows: WatchRow[] = [];
    for (const [label, read] of this.readers) {
      rows.push({ label, value: this.format(read()) });
    }
    return rows;
  }

  /** Strings, numbers, and booleans as they are. Anything else as JSON. */
  private format(value: unknown): string {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (value === null || value === undefined) {
      return String(value);
    }
    return JSON.stringify(value) ?? "";
  }
}

/** The page's one watch list. The dev panel reads it. */
export const debugWatches = new DebugWatchController();
