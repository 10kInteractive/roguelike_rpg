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

/** Two legs, a torso, a light head, and two arms. The head is the face. */
function person(look: ModelLook): ModelPart[] {
  const { color, noseColor, width, height } = look;
  const legW = width * 0.2;
  const legH = height * 0.34;
  const legD = width * 0.24;
  const stance = width * 0.16;
  const stride = width * 0.16;
  const torsoW = width * 0.52;
  const torsoH = height * 0.38;
  const torsoBottom = legH * 0.8;
  const headH = height * 0.26;
  const headY = torsoBottom + torsoH + headH / 2 - height * 0.03;
  const arm = width * 0.16;
  const armX = torsoW / 2 + arm / 2 - width * 0.02;
  const armY = torsoBottom + torsoH * 0.5;

  // One foot forward of the other, so the pair still reads from the side.
  return [
    box(legW, legH, legD, -stance, legH / 2, stride, color),
    box(legW, legH, legD, stance, legH / 2, -stride, color),
    box(torsoW, torsoH, width * 0.4, 0, torsoBottom + torsoH / 2, 0, color),
    box(width * 0.4, headH, width * 0.36, 0, headY, width * 0.06, noseColor),
    box(arm, torsoH * 0.78, arm, -armX, armY, 0, color),
    box(arm, torsoH * 0.78, arm, armX, armY, 0, color),
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
