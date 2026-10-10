import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import { blob } from "./blob/model";
import { heroLook, mobLooks, unknownMobLook } from "./models.constants";
import type { ModelLook } from "./models.types";
import { moth } from "./moth/model";
import { person } from "./person/model";

/** The placeholder hero. Its local +z is the way it faces, and its origin is at its feet. */
export function buildHeroModel(): Group {
  return buildFigure(heroLook, "hero");
}

/**
 * A mob's placeholder. Its local +z is the way it faces, and its origin is on the ground.
 *
 * @param mobId Such as `mob.slime`. A mob with no look draws as a gray person.
 */
export function buildMobModel(mobId: string): Group {
  return buildFigure(mobLooks[mobId] ?? unknownMobLook, mobId);
}

/** Six blocks for the look, lifted by its hover. */
function buildFigure(look: ModelLook, name: string): Group {
  const model = new Group();
  model.name = name;
  const hover = look.hover ?? 0;
  for (const part of partsFor(look)) {
    const block = new Mesh(
      new BoxGeometry(part.width, part.height, part.depth),
      new MeshLambertMaterial({ color: part.color }),
    );
    block.position.set(part.x, hover + part.y, part.z);
    model.add(block);
  }
  return model;
}

/** The six blocks for this shape. Each shape lives beside the looks that use it. */
function partsFor(look: ModelLook) {
  if (look.shape === "blob") return blob(look);
  if (look.shape === "moth") return moth(look);
  return person(look);
}
