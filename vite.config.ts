import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const productionBase = "/roguelike_rpg/";

export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH ?? (mode === "production" ? productionBase : "/"),
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: {
        launcher: "index.html",
        one: "prototypes/one/index.html",
      },
    },
  },
}));
