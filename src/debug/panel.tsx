import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { readWatches, type WatchRow } from "./watch";

const sampleMs = 250;

function DevPanel() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<WatchRow[]>([]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Backquote" || event.repeat) {
        return;
      }
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      event.preventDefault();
      setOpen((current) => !current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const sample = () => setRows(readWatches());
    sample();
    const id = window.setInterval(sample, sampleMs);
    return () => window.clearInterval(id);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <aside
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        zIndex: 10,
        margin: 0,
        padding: "8px 12px",
        background: "rgba(0, 0, 0, 0.75)",
        color: "#eee",
        font: "13px/1.4 ui-monospace, monospace",
      }}
    >
      <div>dev</div>
      {rows.length === 0 ? <div>nothing to watch yet</div> : null}
      {rows.map((row) => (
        <div key={row.label}>
          {row.label}: {row.value}
        </div>
      ))}
    </aside>
  );
}

export function mountDevPanel(): void {
  const host = document.createElement("div");
  document.body.append(host);
  createRoot(host).render(<DevPanel />);
}
