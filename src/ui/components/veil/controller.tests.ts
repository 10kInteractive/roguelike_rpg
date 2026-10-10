import { expect, test } from "vitest";
import { VeilController } from "./controller";

test("the curtain covers, then reveals", async () => {
  const curtain = new VeilController();
  expect(curtain.isCovered()).toBe(false);
  expect(curtain.view().className).toBe("veil");

  await curtain.cover();
  expect(curtain.isCovered()).toBe(true);
  expect(curtain.view().className).toBe("veil covered");

  await curtain.reveal();
  expect(curtain.isCovered()).toBe(false);
  expect(curtain.view().className).toBe("veil");
});
