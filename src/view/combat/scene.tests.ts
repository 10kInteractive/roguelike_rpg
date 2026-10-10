import { Box3 } from "three";
import { expect, test } from "vitest";
import { combatStage, combatSway, combatSwaySeconds } from "./scene.constants";
import { CombatSceneController } from "./scene.controller";

/** Children of one name, such as every `tree`. */
function named(combat: CombatSceneController, name: string) {
  return combat.scene.children.filter((child) => child.name === name);
}

/** The top of the tallest child of that name. */
function tallest(combat: CombatSceneController, name: string): number {
  return Math.max(...named(combat, name).map((child) => new Box3().setFromObject(child).max.y));
}

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

test("set pieces sit off to the sides, on the near ground", () => {
  for (const terrain of ["grass", "forest"] as const) {
    const combat = new CombatSceneController(["mob.slime"], {}, terrain);
    const near = named(combat, "near");
    expect(near.length).toBeGreaterThanOrEqual(2);
    expect(near.every((piece) => piece.position.z > 1.5)).toBe(true);
    expect(near.every((piece) => Math.abs(piece.position.x) > 2.5)).toBe(true);
  }
  const bushes = named(new CombatSceneController(["mob.slime"], {}), "bush");
  expect(bushes.length).toBeGreaterThan(0);
  expect(bushes.every((bush) => Math.abs(bush.position.x) > 2.5)).toBe(true);
});

test("a meadow fight has a low tree line and mountains behind it", () => {
  const combat = new CombatSceneController(["mob.slime"], {});
  expect(named(combat, "mountain").length).toBeGreaterThan(0);
  expect(tallest(combat, "tree")).toBeLessThan(2);
});

test("a forest fight stands among tall trees, with no mountains", () => {
  const combat = new CombatSceneController(["mob.slime"], {}, "forest");
  expect(named(combat, "mountain")).toEqual([]);
  expect(tallest(combat, "tree")).toBeGreaterThan(3);
});

test("the camera drifts on its own during a fight", () => {
  const combat = new CombatSceneController(["mob.slime"], {});
  expect(combat.sway()).toBe(0);

  combat.animate(combatSwaySeconds / 4);
  expect(combat.sway()).toBeCloseTo(combatSway);
});

test("the hero faces west and the pack faces east", () => {
  const combat = new CombatSceneController(["mob.slime"], {});
  expect(combat.scene.getObjectByName("hero")?.rotation.y).toBeCloseTo(-Math.PI / 2);
  expect(combat.scene.getObjectByName("mob.slime")?.rotation.y).toBeCloseTo(Math.PI / 2);
});
