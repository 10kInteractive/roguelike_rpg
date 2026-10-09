import { defineConfig } from "vite";

const productionBase = "/roguelike_rpg/";

export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH ?? (mode === "production" ? productionBase : "/"),
  build: {
    rolldownOptions: {
      input: {
        launcher: "index.html",
        one: "prototypes/one/index.html",
      },
    },
  },
}));
