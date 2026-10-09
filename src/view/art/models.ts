import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import { heroLook, mobLooks, unknownMobLook } from "./models.constants";
import type { ModelLook } from "./models.types";

/** One block of a placeholder. `y` and `z` are its center. +z is the way it faces. */
type ModelPart = {
  /** Width, in tiles. */
  width: number;
  /** Height, in tiles. */
  height: number;
  /** Depth, in tiles. */
  depth: number;
  /** Center, east of the figure's origin. */
  x: number;
  /** Center, up from the ground before hover. */
  y: number;
  /** Center, toward the way the figure faces. */
  z: number;
  /** Block color. */
  color: number;
};

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

/** The six blocks for this shape. */
function partsFor(look: ModelLook): ModelPart[] {
  if (look.shape === "blob") return blob(look);
  if (look.shape === "moth") return moth(look);
  return person(look);
}

/** Feet, a torso, a head, a nose, and two arms. */
function person(look: ModelLook): ModelPart[] {
  const { color, noseColor, width, height } = look;
  const arm = width * 0.18;
  return [
    box(width * 0.72, height * 0.14, width * 0.5, 0, height * 0.07, 0, color),
    box(width * 0.58, height * 0.4, width * 0.46, 0, height * 0.36, 0, color),
    box(width * 0.44, height * 0.28, width * 0.4, 0, height * 0.76, width * 0.04, color),
    box(width * 0.16, height * 0.12, width * 0.16, 0, height * 0.78, width * 0.28, noseColor),
    box(arm, height * 0.36, arm, -width * 0.46, height * 0.42, 0, color),
    box(arm, height * 0.36, arm, width * 0.46, height * 0.42, 0, color),
  ];
}

/** Two feet, a body, a cap, and two eyes on the front. */
function blob(look: ModelLook): ModelPart[] {
  const { color, noseColor, width, height } = look;
  const eye = Math.min(width, height) * 0.16;
  const foot = width * 0.22;
  return [
    box(foot, height * 0.18, foot, -width * 0.22, height * 0.09, width * 0.08, color),
    box(foot, height * 0.18, foot, width * 0.22, height * 0.09, width * 0.08, color),
    box(width * 0.92, height * 0.55, width * 0.8, 0, height * 0.42, 0, color),
    box(width * 0.62, height * 0.28, width * 0.55, 0, height * 0.78, 0, color),
    box(eye, eye, eye, -width * 0.16, height * 0.55, width * 0.38, noseColor),
    box(eye, eye, eye, width * 0.16, height * 0.55, width * 0.38, noseColor),
  ];
}

/** A body, a head, two wings, and two antennae. */
function moth(look: ModelLook): ModelPart[] {
  const { color, noseColor, width, height } = look;
  const antenna = width * 0.06;
  return [
    box(width * 0.28, height * 0.55, width * 0.55, 0, height * 0.35, 0, color),
    box(width * 0.22, height * 0.28, width * 0.22, 0, height * 0.55, width * 0.28, color),
    box(
      width * 0.55,
      height * 0.12,
      width * 0.32,
      -width * 0.42,
      height * 0.48,
      -width * 0.05,
      noseColor,
    ),
    box(
      width * 0.55,
      height * 0.12,
      width * 0.32,
      width * 0.42,
      height * 0.48,
      -width * 0.05,
      noseColor,
    ),
    box(antenna, height * 0.45, antenna, -width * 0.08, height * 0.9, width * 0.32, noseColor),
    box(antenna, height * 0.45, antenna, width * 0.08, height * 0.9, width * 0.32, noseColor),
  ];
}

/** One block, centered at `x`, `y`, `z`. */
function box(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  color: number,
): ModelPart {
  return { width, height, depth, x, y, z, color };
}
