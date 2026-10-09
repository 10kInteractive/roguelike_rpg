import { expect, test } from "vitest";
import type { Snapshot } from "../../../sim/game.types";
import { RunEndController } from "./controller";

const stats = {
  seed: 7,
  fightsWon: 2,
  fightsFled: 1,
  level: 3,
  damageDealt: 40,
  damageTaken: 30,
  potionsUsed: 1,
  distance: 12.4,
  killedBy: "mob.ember_imp",
};

test("victory lists the scoreboard, and game over names what killed you", () => {
  const ending = new RunEndController();
  const victory = ending.show({ mode: "victory", stats } as Snapshot, 65_000);
  expect(victory?.text).toContain("Victory");
  expect(victory?.text).toContain("Time          1:05");
  expect(victory?.text).toContain("Seed          7");
  expect(victory?.text).not.toContain("Defeated");

  const lost = ending.show({ mode: "gameOver", stats } as Snapshot, 0);
  expect(lost?.text).toContain("Game Over");
  expect(lost?.text).toContain("Defeated by Ember Imp");
  expect(ending.show({ mode: "field", stats } as Snapshot, 0)).toBeNull();
});
