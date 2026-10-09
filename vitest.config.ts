import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.tests.ts", "tools/**/*.tests.ts"],
  },
});
