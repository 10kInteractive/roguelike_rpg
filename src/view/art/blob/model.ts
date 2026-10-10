import type { ModelLook } from "../models.types";
import type { ModelPart } from "../part";
import { box } from "../part";

/** Two feet, a body, a cap, and two eyes on the front. */
export function blob(look: ModelLook): ModelPart[] {
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
