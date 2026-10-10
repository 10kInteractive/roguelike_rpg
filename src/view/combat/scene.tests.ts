import { Box3, Mesh, type MeshBasicMaterial, PlaneGeometry } from "three";
import { expect, test } from "vitest";
import { combatStage, combatSway, combatSwaySeconds, selectionRing } from "./scene.constants";
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

test("the pack stays in its slots, and the ring starts under the lead", () => {
  const mobIds = ["mob.frost_moth", "mob.ember_imp", "mob.slime"];
  const combat = new CombatSceneController(mobIds, {});
  const { pack, packStagger } = combatStage;
  expect(packXs(combat, mobIds)).toEqual([pack.x, pack.x - packStagger, pack.x - 2 * packStagger]);
  const ring = combat.scene.getObjectByName("selection-ring");
  expect(ring?.position.x).toBeCloseTo(pack.x);
  expect(ring?.position.z).toBeCloseTo(pack.z);
  expect(ring?.position.y).toBeCloseTo(selectionRing.y);
  expect(ring?.visible).toBe(true);
  expect(ring).toBeInstanceOf(Mesh);
  const mesh = ring as Mesh;
  expect(mesh.geometry).toBeInstanceOf(PlaneGeometry);
  const material = mesh.material as MeshBasicMaterial;
  expect(material.transparent).toBe(true);
  const image = material.map?.image as { data?: Uint8Array } | undefined;
  const pixels = image?.data;
  if (!pixels) throw new Error("the ring texture is missing");
  const line = Math.round(selectionRing.alpha * 255);
  let marked = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === line) marked += 1;
  expect(marked).toBeGreaterThan(0);
  expect(marked).toBeLessThan(pixels.length / 8);
});

test("focusing another mob sends the first one back", () => {
  const mobIds = ["mob.frost_moth", "mob.ember_imp"];
  const combat = new CombatSceneController(mobIds, {});
  combat.focus(1);
  const { pack, packStagger, focusStep } = combatStage;
  expect(packXs(combat, mobIds)).toEqual([pack.x, pack.x - packStagger + focusStep]);
  expect(combat.focusedIndex()).toBe(1);
});

test("the ring moves under a back mob and the pack stays put", () => {
  const mobIds = ["mob.frost_moth", "mob.ember_imp", "mob.slime"];
  const combat = new CombatSceneController(mobIds, {});
  const before = packXs(combat, mobIds);
  const { pack, packStagger, packSpacing } = combatStage;

  combat.ringAt(2);
  expect(packXs(combat, mobIds)).toEqual(before);
  const ring = combat.scene.getObjectByName("selection-ring");
  expect(ring?.position.x).toBeCloseTo(pack.x - 2 * packStagger);
  expect(ring?.position.z).toBeCloseTo(pack.z - 2 * packSpacing);
  expect(combat.focusedIndex()).toBe(2);

  combat.ringAt(null);
  expect(ring?.visible).toBe(false);
  expect(packXs(combat, mobIds)).toEqual(before);
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
