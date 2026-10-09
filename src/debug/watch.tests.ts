import { expect, test } from "vitest";
import { DebugWatchController } from "./watch.controller";

test("watch reports the current value", () => {
  const watches = new DebugWatchController();
  let distance = 1;
  watches.watch("encounter distance", () => distance);
  distance = 4;
  const row = watches.rows().find((item) => item.label === "encounter distance");
  expect(row?.value).toBe("4");
});
