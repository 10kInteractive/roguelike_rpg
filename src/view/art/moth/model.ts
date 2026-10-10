import type { ModelLook } from "../models.types";
import type { ModelPart } from "../part";
import { box } from "../part";

/** A body, a head, two wings, and two antennae. */
export function moth(look: ModelLook): ModelPart[] {
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
