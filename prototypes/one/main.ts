import { mountRenderer } from "../../src/view/renderer";

const app = document.getElementById("app");
const status = document.getElementById("status");

if (!app || !status) {
  throw new Error("Missing #app or #status element");
}

try {
  const backend = await mountRenderer(app);
  status.textContent = `Renderer backend: ${backend}`;
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown renderer error";
  status.textContent = `Renderer failed: ${message}`;
}
