import { expect, test } from "vitest";
import type { FieldRunResult } from "../sim/run/run.types";
import { formatGrinderFieldSweepSummary } from "./field-sweep";

test("a field sweep averages the runs and lists deaths by mob", () => {
  const win: FieldRunResult = {
    outcome: "win",
    bossLevel: 5,
    fights: 10,
    distance: 80,
    playSeconds: 600,
    potionsUsed: 1,
  };
  const loss: FieldRunResult = {
    outcome: "lose",
    bossLevel: 4,
    fights: 8,
    distance: 40,
    playSeconds: 300,
    potionsUsed: 3,
    killedBy: "mob.rust_sentinel",
  };
  const early: FieldRunResult = {
    outcome: "lose",
    fights: 2,
    distance: 10,
    playSeconds: 60,
    potionsUsed: 0,
    killedBy: "mob.slime",
  };

  expect(formatGrinderFieldSweepSummary([win, loss, early])).toBe(
    [
      "runs 3",
      "win rate 0.333",
      "boss level 4.500",
      "fights 6.667",
      "distance 43.333",
      "play time 5.333 min",
      "potions 1.333",
      "deaths mob.rust_sentinel 1",
      "deaths mob.slime 1",
    ].join("\n"),
  );
  expect(formatGrinderFieldSweepSummary([])).toContain("boss level none");
});
