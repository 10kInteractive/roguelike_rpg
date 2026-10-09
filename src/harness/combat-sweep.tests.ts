import { expect, test } from "vitest";
import { sweepSummary } from "./combat-sweep";

test("a sweep counts fights, the win rate, and deaths by mob", () => {
  const summary = sweepSummary([
    { enemyId: "mob.slime", outcome: "win" },
    { enemyId: "mob.slime", outcome: "flee" },
    { enemyId: "mob.rust_sentinel", outcome: "lose" },
    { enemyId: "mob.ember_imp", outcome: "lose" },
    { enemyId: "mob.ember_imp", outcome: "lose" },
  ]);
  expect(summary).toBe(
    ["fights 5", "win rate 0.200", "deaths mob.ember_imp 2", "deaths mob.rust_sentinel 1"].join(
      "\n",
    ),
  );
});
