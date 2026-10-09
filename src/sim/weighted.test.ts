import { expect, test } from "vitest";
import { pickWeighted } from "./weighted";

const actions = [
  { type: "fight", weight: 60 },
  { type: "defend", weight: 30 },
  { type: "potion", weight: 10 },
];

test("a weighted roll walks the list, and a boundary belongs to the next action", () => {
  expect(pickWeighted(actions, 0).type).toBe("fight");
  expect(pickWeighted(actions, 0.5).type).toBe("fight");
  expect(pickWeighted(actions, 0.6).type).toBe("defend");
  expect(pickWeighted(actions, 0.9).type).toBe("potion");
  expect(pickWeighted(actions, 0.99).type).toBe("potion");
});
