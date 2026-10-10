import type { ModelLook } from "../models.types";
import type { ModelPart } from "../part";
import { box } from "../part";

/** Two legs, a torso, a light head, and two arms. The head is the face. */
export function person(look: ModelLook): ModelPart[] {
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
