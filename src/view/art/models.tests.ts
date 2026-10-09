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
