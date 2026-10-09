import { expect, test } from "vitest";
import { fight } from "./fight";
import { type KnownSpell, randomAction } from "./policy";
import { actionsFrom, eventHash, outcomeFrom, toScript } from "./replay";
import { createRng } from "./rng";

const hero = {
  id: "hero",
  hp: 30,
  str: 8,
  def: 4,
  haste: 8,
  mag: 6,
  mp: 10,
  potions: 2,
  hero: true,
};
const slime = { id: "slime", hp: 40, str: 6, def: 2, haste: 5 };
const spells: KnownSpell[] = [
  { id: "spell.ember", element: "fire", power: 8, cost: 3 },
  { id: "spell.frost", element: "ice", power: 8, cost: 3 },
];

const rules = {
  turnBase: 100,
  spreadMin: 0.9,
  spreadMax: 1.1,
  critChance: 0.05,
  critMultiplier: 1.5,
  defendMultiplier: 0.5,
  weaknessMultiplier: 1.5,
  resistanceMultiplier: 0.5,
  potionHeal: 25,
  fleeBase: 0.5,
  fleePerPoint: 0.05,
  fleeMin: 0.1,
  fleeMax: 0.9,
};

test("the same seed and action list hash the same, and a different action does not", () => {
  const played = () =>
    fight({
      ...rules,
      hero,
      enemy: slime,
      rng: createRng(1),
      heroActions: ["fight", "potion"],
      enemyActions: ["fight", "fight"],
    });
  const once = played();
  const twice = played();
  expect(eventHash(once)).toBe(eventHash(twice));

  const other = fight({
    ...rules,
    hero,
    enemy: slime,
    rng: createRng(1),
    heroActions: ["defend", "potion"],
    enemyActions: ["fight", "fight"],
  });
  expect(eventHash(other)).not.toBe(eventHash(once));
});

test("a recorded fight replays to the same hash", () => {
  const enemy = {
    ...slime,
    actions: [
      { type: "fight" as const, weight: 1 },
      { type: "grind" as const, multiplier: 1.5, weight: 1 },
    ],
  };
  const combat = createRng(4);
  const choice = createRng(4);
  const events = fight({
    ...rules,
    hero,
    enemy,
    rng: combat,
    choiceRng: choice,
    heroPolicy: (actor) => randomAction(actor, spells, choice),
  });
  const actions = actionsFrom(events, hero.id);
  const replayed = fight({
    ...rules,
    hero,
    enemy,
    rng: createRng(4),
    heroActions: toScript(actions.hero, spells),
    enemyActions: toScript(actions.enemy, spells),
  });
  expect(eventHash(replayed)).toBe(eventHash(events));
  expect(outcomeFrom(events, hero.id)).toBe(outcomeFrom(replayed, hero.id));
});
