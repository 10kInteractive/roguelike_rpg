import type { ModelLook } from "../models.types";
import type { ModelPart } from "../part";
import { box } from "../part";

/** A long body, a head in front of it, a snout, a tail, and a front and hind leg. */
export function wolf(look: ModelLook): ModelPart[] {
  const { color, noseColor, width, height } = look;
  const bodyL = width * 1.2;
  const bodyH = height * 0.28;
  const legH = height * 0.48;
  const legW = width * 0.12;
  const bodyY = legH * 0.82 + bodyH / 2;
  const headL = width * 0.42;
  const headH = height * 0.4;
  const headZ = bodyL / 2 + headL * 0.2;
  const snoutL = headL * 0.85;
  const snoutZ = headZ + headL * 0.35 + snoutL * 0.35;

  // The head and snout lead the body. The tail sticks out behind.
  return [
    box(width * 0.46, bodyH, bodyL, 0, bodyY, 0, color),
    box(width * 0.36, headH, headL, 0, bodyY + headH * 0.15, headZ, color),
    box(width * 0.22, headH * 0.38, snoutL, 0, bodyY - bodyH * 0.05, snoutZ, noseColor),
    box(width * 0.1, height * 0.1, width * 0.5, 0, bodyY + height * 0.16, -bodyL * 0.55, color),
    box(legW, legH, legW, -width * 0.1, legH / 2, bodyL * 0.22, color),
    box(legW, legH, legW, -width * 0.1, legH / 2, -bodyL * 0.28, color),
  ];
}
