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

const hero = {
  id: "hero.strider",
  hp: 30,
  maxHp: 30,
  mp: 10,
  maxMp: 10,
  str: 8,
  def: 4,
  mag: 6,
  haste: 8,
  potions: 3,
  level: 1,
  xp: 0,
};
const enemy = { id: "mob.ember_imp", hp: 14, maxHp: 14, mp: 9, maxMp: 9 };
const fighting = {
  mode: "combat",
  hero,
  combat: { mobId: enemy.id, enemy, turnOrder: [hero.id] },
} as Snapshot;

test("a hit updates the fighter it landed on, and only once that event plays", () => {
  const store = new UiStoreController();
  store.present(fighting);
  store.enqueue([
    { type: "attacked", actorId: hero.id, targetId: enemy.id },
    {
      type: "damaged",
      actorId: hero.id,
      targetId: enemy.id,
      amount: 7,
      targetHp: 7,
      critical: false,
    },
    { type: "attacked", actorId: enemy.id, targetId: hero.id },
    {
      type: "damaged",
      actorId: enemy.id,
      targetId: hero.id,
      amount: 4,
      targetHp: 26,
      critical: false,
    },
  ]);

  store.played();
  expect(store.snapshot()?.hero.hp).toBe(30);
  expect(store.snapshot()?.combat?.enemy.hp).toBe(14);

  store.played();
  expect(store.snapshot()?.hero.hp).toBe(30);
  expect(store.snapshot()?.combat?.enemy.hp).toBe(7);

  store.played();
  expect(store.snapshot()?.hero.hp).toBe(30);

  store.played();
  expect(store.snapshot()?.hero.hp).toBe(26);
  expect(store.snapshot()?.combat?.enemy.hp).toBe(7);
});

test("a spell, a drink, and a level write their points when they play", () => {
  const store = new UiStoreController();
  store.present(fighting);
  store.enqueue([
    { type: "spellCast", actorId: enemy.id, spellId: "spell.ember", targetId: hero.id, mp: 6 },
    {
      type: "damaged",
      actorId: enemy.id,
      targetId: hero.id,
      amount: 14,
      targetHp: 16,
      critical: false,
    },
    { type: "itemUsed", actorId: hero.id, itemId: "item.potion", amount: 14, hp: 30, remaining: 2 },
    { type: "spellCast", actorId: hero.id, spellId: "spell.frost", targetId: enemy.id, mp: 7 },
    {
      type: "levelUp",
      level: 2,
      hp: 36,
      maxHp: 36,
      mp: 12,
      maxMp: 12,
      str: 10,
      def: 5,
      mag: 7,
      haste: 9,
    },
  ]);

  store.played();
  expect(store.snapshot()?.combat?.enemy.mp).toBe(6);
  expect(store.snapshot()?.hero.hp).toBe(30);

  store.played();
  expect(store.snapshot()?.hero.hp).toBe(16);

  store.played();
  expect(store.snapshot()?.hero).toMatchObject({ hp: 30, potions: 2 });

  store.played();
  expect(store.snapshot()?.hero.mp).toBe(7);
  expect(store.snapshot()?.combat?.enemy.hp).toBe(14);

  store.played();
  expect(store.snapshot()?.hero).toMatchObject({ level: 2, hp: 36, maxHp: 36, mp: 12, str: 10 });
});

test("a played hit adds its line, and the log keeps the latest six", () => {
  const store = new UiStoreController();
  store.present(fighting);
  const hits: SimEvent[] = [];
  for (let count = 0; count < 7; count++) {
    hits.push({ type: "attacked", actorId: enemy.id, targetId: hero.id });
  }
  store.enqueue(hits);

  for (let count = 0; count < 7; count++) store.played();

  expect(store.log()).toEqual(Array.from({ length: 6 }, () => "Ember Imp attacks"));
  expect(store.snapshot()?.hero.hp).toBe(30);

  store.present(fighting);
  expect(store.log()).toHaveLength(6);

  store.present({ ...fighting, mode: "field", combat: undefined });
  expect(store.log()).toEqual([]);
});

test("play time starts with the run and freezes when it ends", () => {
  let now = 1_000;
  const store = new UiStoreController(() => now);
  store.present({ mode: "field" } as Snapshot);
  now = 4_000;
  store.present({ mode: "combat" } as Snapshot);
  expect(store.playMs()).toBeNull();

  now = 9_000;
  store.present({ mode: "victory" } as Snapshot);
  expect(store.playMs()).toBe(8_000);
  now = 12_000;
  store.present({ mode: "victory" } as Snapshot);
  expect(store.playMs()).toBe(8_000);

  store.present({ mode: "field" } as Snapshot);
  expect(store.playMs()).toBeNull();
  now = 13_500;
  store.present({ mode: "gameOver" } as Snapshot);
  expect(store.playMs()).toBe(1_500);
});

test("leaving combat closes a command window", () => {
  const store = new UiStoreController();
  store.present({ mode: "combat" } as Snapshot);
  void store.requestCommand([]);
  expect(store.api().getState().commands).not.toBeNull();

  store.present({ mode: "field" } as Snapshot);
  expect(store.api().getState().commands).toBeNull();
});

test("a pause is left off the play clock", () => {
  let now = 1_000;
  const store = new UiStoreController(() => now);
  store.present({ mode: "field" } as Snapshot);
  now = 2_000;
  store.holdClock();
  now = 5_000;
  store.releaseClock();
  now = 9_000;
  store.present({ mode: "victory" } as Snapshot);
  expect(store.playMs()).toBe(5_000);
});

test("a confirm restarts, and one that arrives first still counts", async () => {
  const store = new UiStoreController();
  store.present({ mode: "victory" } as Snapshot);

  let done = false;
  const waiting = store.requestRestart().then(() => {
    done = true;
  });
  expect(done).toBe(false);
  store.confirmRestart();
  await waiting;
  expect(done).toBe(true);

  store.confirmRestart();
  await store.requestRestart();

  store.present({ mode: "field" } as Snapshot);
  store.confirmRestart();
  let skipped = false;
  const pending = store.requestRestart().then(() => {
    skipped = true;
  });
  await Promise.resolve();
  expect(skipped).toBe(false);
  store.present({ mode: "gameOver" } as Snapshot);
  store.confirmRestart();
  await pending;
});
