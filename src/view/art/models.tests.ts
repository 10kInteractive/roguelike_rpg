import { Mesh } from "three";
import { expect, test } from "vitest";
import { buildHeroModel, buildMobModel } from "./models";
import { mobLooks } from "./models.constants";

function blocks(model: ReturnType<typeof buildHeroModel>): Mesh[] {
  return model.children.filter((child): child is Mesh => child instanceof Mesh);
}

test("the hero and every mob are six blocks, and a face mark points forward", () => {
  const hero = buildHeroModel();
  expect(hero.name).toBe("hero");
  expect(blocks(hero)).toHaveLength(6);
  expect(blocks(hero).some((block) => block.position.z > 0)).toBe(true);

  for (const mobId of Object.keys(mobLooks)) {
    const mob = buildMobModel(mobId);
    expect(mob.name).toBe(mobId);
    expect(blocks(mob)).toHaveLength(6);
    expect(blocks(mob).some((block) => block.position.z > 0)).toBe(true);
  }

  expect(blocks(buildMobModel("mob.missing"))).toHaveLength(6);
});

test("a person stands on two feet", () => {
  for (const model of [
    buildHeroModel(),
    buildMobModel("mob.ember_imp"),
    buildMobModel("mob.rust_sentinel"),
    buildMobModel("mob.missing"),
  ]) {
    const parts = blocks(model);
    const lowest = Math.min(...parts.map((block) => block.position.y));
    const feet = parts.filter((block) => block.position.y === lowest);
    expect(feet).toHaveLength(2);
    expect(feet[0]?.position.x).not.toBe(feet[1]?.position.x);
  }
});
