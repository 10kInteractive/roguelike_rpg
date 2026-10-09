import { createRoot } from "react-dom/client";
import { Overlay } from "../../src/ui/Overlay";
import { mountRenderer } from "../../src/view/renderer";

const view = document.getElementById("view");
const overlay = document.getElementById("overlay");

if (!view || !overlay) {
  throw new Error("Missing #view or #overlay element");
}

const root = createRoot(overlay);
root.render(<Overlay status="Starting renderer…" />);

try {
  const backend = await mountRenderer(view);
  root.render(<Overlay status={`Renderer backend: ${backend}`} />);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown renderer error";
  root.render(<Overlay status={`Renderer failed: ${message}`} />);
}
