import { expect, test } from "vitest";
import type { SimEvent, Snapshot } from "../sim/game.types";
import { UiStoreController } from "./store.controller";

const snapshot = { mode: "field" } as Snapshot;
const hit: SimEvent = { type: "attacked", actorId: "hero.strider", targetId: "mob.slime" };
const hurt: SimEvent = {
  type: "damaged",
  actorId: "hero.strider",
  targetId: "mob.slime",
  amount: 4,
  targetHp: 8,
  critical: false,
};

test("a presented snapshot replaces the last one, and the queue starts empty", () => {
  const store = new UiStoreController();
  expect(store.snapshot()).toBeNull();
  expect(store.pending()).toEqual([]);

  store.present(snapshot);
  expect(store.snapshot()).toBe(snapshot);
  store.present({ mode: "combat" } as Snapshot);
  expect(store.snapshot()).toMatchObject({ mode: "combat" });
});

test("events wait in order, and each played one leaves the front", () => {
  const store = new UiStoreController();
  store.enqueue([hit, hurt]);
  expect(store.next()).toEqual(hit);
  expect(store.pending()).toEqual([hit, hurt]);

  store.played();
  expect(store.next()).toEqual(hurt);
  store.played();
  expect(store.next()).toBeUndefined();
  expect(store.pending()).toEqual([]);
  store.played();
  expect(store.pending()).toEqual([]);
});

test("a later batch waits behind what is already queued", () => {
  const store = new UiStoreController();
  store.enqueue([hit]);
  store.enqueue([hurt]);
  expect(store.pending()).toEqual([hit, hurt]);
});

test("two stores do not share a queue", () => {
  const one = new UiStoreController();
  const other = new UiStoreController();
  one.enqueue([hit]);
  expect(other.pending()).toEqual([]);
});
