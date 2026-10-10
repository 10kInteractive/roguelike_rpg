import { expect, test } from "vitest";
import { HasteTurnQueue } from "./turn-queue.controller";
import type { TurnActor } from "./turn-queue.types";

const turnBase = 100;

function take(actors: readonly TurnActor[], count: number): string[] {
  return new HasteTurnQueue(actors, turnBase).upcoming(count);
}

const hero: TurnActor = { id: "hero", haste: 2, hero: true };
const imp: TurnActor = { id: "imp", haste: 1 };

test("haste 2 acts twice as often as haste 1", () => {
  const turns = take([hero, imp], 12);
  expect(turns).toEqual([
    "hero",
    "imp",
    "hero",
    "hero",
    "imp",
    "hero",
    "hero",
    "imp",
    "hero",
    "hero",
    "imp",
    "hero",
  ]);
  const heroTurns = turns.filter((id) => id === "hero").length;
  expect(heroTurns).toBe(8);
});

test("a tie goes to the higher haste, then the hero, then list order", () => {
  expect(
    take(
      [
        { id: "hero", haste: 8, hero: true },
        { id: "moth", haste: 12 },
      ],
      1,
    ),
  ).toEqual(["moth"]);
  expect(
    take(
      [
        { id: "slime", haste: 5 },
        { id: "hero", haste: 5, hero: true },
      ],
      1,
    ),
  ).toEqual(["hero"]);
  expect(
    take(
      [
        { id: "slime", haste: 5 },
        { id: "imp", haste: 5 },
      ],
      1,
    ),
  ).toEqual(["slime"]);
});

test("a fast moth acts ahead of the hero, who acts ahead of a slime", () => {
  expect(
    take(
      [
        { id: "hero", haste: 8, hero: true },
        { id: "frost_moth", haste: 12 },
        { id: "slime", haste: 5 },
      ],
      12,
    ),
  ).toEqual([
    "frost_moth",
    "hero",
    "slime",
    "frost_moth",
    "hero",
    "frost_moth",
    "slime",
    "frost_moth",
    "hero",
    "frost_moth",
    "hero",
    "slime",
  ]);
});

test("replacing the mob keeps that turn's time", () => {
  const queue = new HasteTurnQueue(
    [
      { id: "hero", haste: 1, hero: true },
      { id: "imp", haste: 1 },
    ],
    turnBase,
  );
  queue.act();
  queue.act();
  queue.replace("imp", { id: "moth", haste: 1 });

  expect(queue.upcoming(2)).toEqual(["hero", "moth"]);
});

test("upcoming previews turns without spending them", () => {
  const queue = new HasteTurnQueue([hero, imp], turnBase);
  expect(queue.upcoming(4)).toEqual(queue.upcoming(4));
  expect(queue.act()).toBe("hero");
  expect(queue.upcoming(1)).toEqual(["imp"]);
});
