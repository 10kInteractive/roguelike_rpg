import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import { heroLook, mobLooks, unknownMobLook } from "./models.constants";
import type { ModelLook } from "./models.types";

/** The placeholder hero. Its local +z is the way it faces, and its origin is at its feet. */
export function buildHeroModel(): Group {
  return buildBlockModel(heroLook, "hero");
}

/**
 * A mob's placeholder block. Its local +z is the way it faces, and its origin is on the ground.
 *
 * @param mobId Such as `mob.slime`. A mob with no look draws as a gray block.
 */
export function buildMobModel(mobId: string): Group {
  return buildBlockModel(mobLooks[mobId] ?? unknownMobLook, mobId);
}

/** A body block and a nose on its +z side, lifted by the look's hover. */
function buildBlockModel(look: ModelLook, name: string): Group {
  const { color, noseColor, width, height, hover = 0 } = look;
  const body = new Mesh(
    new BoxGeometry(width, height, width).translate(0, hover + height / 2, 0),
    new MeshLambertMaterial({ color }),
  );
  const noseSize = Math.min(width, height) * 0.4;
  const nose = new Mesh(
    new BoxGeometry(noseSize, noseSize, noseSize),
    new MeshLambertMaterial({ color: noseColor }),
  );
  nose.position.set(0, hover + height * 0.7, width / 2 + noseSize * 0.35);
  const model = new Group();
  model.add(body, nose);
  model.name = name;
  return model;
}
