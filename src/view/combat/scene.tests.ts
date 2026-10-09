import { expect, test } from "vitest";
import { combatStage } from "./scene.constants";
import { CombatSceneController } from "./scene.controller";

/** The x of each pack model, in fight order. */
function packXs(combat: CombatSceneController, mobIds: string[]): number[] {
  return mobIds.map((id) => combat.scene.getObjectByName(id)?.position.x ?? Number.NaN);
}

test("the first mob steps out toward the hero, the rest wait staggered behind", () => {
  const mobIds = ["mob.frost_moth", "mob.ember_imp", "mob.slime"];
  const combat = new CombatSceneController(mobIds, {});
  const { pack, packStagger, focusStep } = combatStage;
  expect(packXs(combat, mobIds)).toEqual([
    pack.x + focusStep,
    pack.x - packStagger,
    pack.x - 2 * packStagger,
  ]);
});

test("focusing another mob sends the first one back", () => {
  const mobIds = ["mob.frost_moth", "mob.ember_imp"];
  const combat = new CombatSceneController(mobIds, {});
  combat.focus(1);
  const { pack, packStagger, focusStep } = combatStage;
  expect(packXs(combat, mobIds)).toEqual([pack.x, pack.x - packStagger + focusStep]);
  expect(combat.focusedIndex()).toBe(1);
});

test("the hero faces west and the pack faces east", () => {
  const combat = new CombatSceneController(["mob.slime"], {});
  expect(combat.scene.getObjectByName("hero")?.rotation.y).toBeCloseTo(-Math.PI / 2);
  expect(combat.scene.getObjectByName("mob.slime")?.rotation.y).toBeCloseTo(Math.PI / 2);
});
