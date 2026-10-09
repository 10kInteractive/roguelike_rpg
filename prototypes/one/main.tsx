import { createRoot } from "react-dom/client";
import { GameRuntimeController } from "../../src/runtime/runtime.controller";
import { Overlay } from "../../src/ui/components/overlay/markup";
import { bundleSource } from "./bundle-source";

const view = document.getElementById("view");
const overlay = document.getElementById("overlay");

if (!view || !overlay) {
  throw new Error("Missing #view or #overlay element");
}

if (import.meta.env.DEV) {
  const { mountDevPanel } = await import("../../src/debug/panel");
  mountDevPanel();
}

const root = createRoot(overlay);
const runtime = new GameRuntimeController({
  view,
  bundleSource,
  onStatus: (status) => root.render(<Overlay status={status} />),
});
await runtime.start();
