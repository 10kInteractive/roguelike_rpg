import { expect, test } from "vitest";
import { readWatches, watch } from "./watch";

test("watch reports the current value", () => {
  let distance = 1;
  watch("encounter distance", () => distance);
  distance = 4;
  const row = readWatches().find((item) => item.label === "encounter distance");
  expect(row?.value).toBe("4");
});
