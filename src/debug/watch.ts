export type WatchRow = {
  label: string;
  value: string;
};

const watchers = new Map<string, () => unknown>();

function formatWatchValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) {
    return String(value);
  }
  return JSON.stringify(value) ?? "";
}

export function watch(label: string, read: () => unknown): void {
  watchers.set(label, read);
}

export function readWatches(): WatchRow[] {
  const rows: WatchRow[] = [];
  for (const [label, read] of watchers) {
    rows.push({ label, value: formatWatchValue(read()) });
  }
  return rows;
}
