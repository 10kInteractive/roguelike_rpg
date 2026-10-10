import { expect, test } from "vitest";
import assets from "../../prototypes/one/bundle/assets.json" with { type: "json" };
import biome from "../../prototypes/one/bundle/biome.meadow.json" with { type: "json" };
import manifest from "../../prototypes/one/bundle/bundle.json" with { type: "json" };
import encounters from "../../prototypes/one/bundle/encounters.json" with { type: "json" };
import hero from "../../prototypes/one/bundle/hero.json" with { type: "json" };
import items from "../../prototypes/one/bundle/items.json" with { type: "json" };
import mobs from "../../prototypes/one/bundle/mobs.json" with { type: "json" };
import rules from "../../prototypes/one/bundle/rules.json" with { type: "json" };
import spells from "../../prototypes/one/bundle/spells.json" with { type: "json" };
import { heroFighterFromBundle } from "../content/fighters";
import { loadBundle } from "../content/load";
import {
  combatRulesFromBundle,
  encounterTablesFromBundle,
  levelRulesFromBundle,
  runMobsFromBundle,
} from "../content/rules";
import { CombatActionPolicy } from "./combat/policy.controller";
import { returnGuardTicks } from "./field/governor.constants";
import { createSeededMeadow } from "./field/map";
import { stickLimit } from "./field/movement.constants";
import { FieldWalkPolicy } from "./field/policy.controller";
import { startingFacing } from "./game.constants";
import type { SimEvent } from "./game.types";
import { createSim } from "./index";
import { GrinderFieldRunController } from "./run/run.controller";
import { SeededRandomGenerator } from "./utils/rng.controller";

const bundle = loadBundle({
  manifest,
  rules,
  hero,
  spells,
  items,
  mobs,
  encounters,
  biomes: [biome],
  assets,
});

test("a new run stands on its spawn, facing south, and may only move", () => {
  const sim = createSim({ bundle, seed: 1 });
  const snapshot = sim.observe();

  expect(snapshot.mode).toBe("field");
  expect(snapshot.field.position).toEqual({
    x: snapshot.field.map.spawn.x + 0.5,
    y: snapshot.field.map.spawn.y + 0.5,
  });
  expect(snapshot.field.facing).toEqual(startingFacing);
  expect(snapshot.hero).toMatchObject({ id: "hero.strider", level: 1, potions: 3 });
  expect(snapshot.stats).toMatchObject({ seed: 1, distance: 0, fightsWon: 0 });
  expect(sim.legalActions()).toEqual([{ type: "move", x: stickLimit, y: stickLimit }]);
  expect(snapshot.combat).toBeUndefined();
});

test("walking north moves the hero, and a fight command is refused", () => {
  const sim = createSim({ bundle, seed: 1 });
  const before = sim.observe().field.position;

  expect(sim.act({ type: "move", x: 0, y: stickLimit })).toEqual([]);

  const after = sim.observe();
  expect(after.field.position.y).toBeGreaterThan(before.y);
  expect(after.field.position.x).toBe(before.x);
  expect(after.field.facing).toEqual({ x: 0, y: stickLimit });
  expect(after.stats.distance).toBeGreaterThan(0);
  expect(() => sim.act({ type: "fight", target: "mob.slime" })).toThrow(/not available/);
  expect(sim.observe().field.position).toEqual(after.field.position);
});

test("a stick past the limit is refused", () => {
  const sim = createSim({ bundle, seed: 1 });
  expect(() => sim.act({ type: "move", x: stickLimit + 1, y: 0 })).toThrow(/-64 to 64/);
  expect(sim.observe().stats.distance).toBe(0);
});

test("the first fight of seed 7 opens on the hero's turn and is won", () => {
  const choiceRng = new SeededRandomGenerator(7);
  const sim = createSim({
    bundle,
    seed: 7,
    rngs: {
      field: new SeededRandomGenerator(7),
      choice: choiceRng,
      combat: new SeededRandomGenerator(7),
    },
  });
  const started = walkToFight(sim, choiceRng);

  expect(started.some((event) => event.type === "encounterStarted")).toBe(true);
  expect(started.at(-1)).toMatchObject({ type: "turnStarted", actorId: "hero.strider" });
  expect(sim.observe().mode).toBe("combat");
  expect(sim.observe().combat?.mobId).toBe("mob.ember_imp");
  expect(sim.observe().combat?.turnOrder[0]).toBe("hero.strider");
  expect(sim.legalActions().map((action) => action.type)).toEqual([
    "fight",
    "cast",
    "cast",
    "item",
    "defend",
    "run",
  ]);

  const combat = new CombatActionPolicy([], choiceRng);
  let guard = 0;
  while (sim.observe().mode === "combat" && guard < 100) {
    guard += 1;
    const snapshot = sim.observe();
    const choice = combat.chooseFighter(snapshot.hero);
    const target = snapshot.combat?.mobId ?? "";
    sim.act(
      choice === "potion" ? { type: "item", item: "item.potion" } : { type: "fight", target },
    );
  }

  const end = sim.observe();
  expect(end.mode).toBe("field");
  expect(end.field.guardTicks).toBe(returnGuardTicks);
  expect(end.hero).toMatchObject({ level: 2, hp: 36, maxHp: 36, potions: 2 });
  expect(end.stats.fightsWon).toBe(2);
  expect(end.combat).toBeUndefined();
});

test("a seed played one action at a time matches the headless grinder run", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const headless = new GrinderFieldRunController(grinderInput(seed)).play();
    const played = playGrinder(seed);

    expect(played.outcome, `seed ${seed}`).toBe(headless.outcome);
    expect(played.fights, `seed ${seed}`).toBe(headless.fights);
    expect(played.distance, `seed ${seed}`).toBeCloseTo(headless.distance, 9);
    expect(played.bossLevel, `seed ${seed}`).toBe(headless.bossLevel);
    expect(played.killedBy, `seed ${seed}`).toBe(headless.killedBy);
  }
});

/** The grinder's setup for one seed, the same way the sweep builds it. */
function grinderInput(seed: number) {
  const map = createSeededMeadow({
    seed,
    width: biome.width,
    height: biome.height,
    minibossDistance: biome.minibossDistance,
  });
  return {
    seed,
    map,
    miniboss: { tile: map.miniboss, radius: biome.minibossRadius, id: biome.miniboss },
    tables: encounterTablesFromBundle(bundle),
    minDistance: bundle.rules.minEncounterDistance,
    hero: heroFighterFromBundle(bundle.hero),
    mobs: runMobsFromBundle(bundle),
    combat: combatRulesFromBundle(bundle),
    leveling: levelRulesFromBundle(bundle),
  };
}

/** Walks and fights through act(), with the grinder's policies sharing the sim's choice rolls. */
function playGrinder(seed: number) {
  const fieldRng = new SeededRandomGenerator(seed);
  const choiceRng = new SeededRandomGenerator(seed);
  const sim = createSim({
    bundle,
    seed,
    rngs: { field: fieldRng, choice: choiceRng, combat: new SeededRandomGenerator(seed) },
  });
  const walk = new FieldWalkPolicy({
    field: sim.observe().field.map,
    miniboss: sim.observe().field.miniboss.tile,
    rng: choiceRng,
  });
  const combat = new CombatActionPolicy([], choiceRng);

  let stick = { x: 0, y: 0 };
  let ticksLeft = 0;
  let bossLevel: number | undefined;
  for (let step = 0; step < 200_000; step++) {
    const snapshot = sim.observe();
    if (snapshot.mode === "victory" || snapshot.mode === "gameOver") {
      const fights =
        snapshot.stats.fightsWon +
        snapshot.stats.fightsFled +
        (snapshot.mode === "gameOver" ? 1 : 0);
      return {
        outcome: snapshot.mode === "victory" ? "win" : "lose",
        fights,
        distance: snapshot.stats.distance,
        bossLevel,
        killedBy: snapshot.stats.killedBy,
      };
    }

    if (snapshot.mode === "field") {
      if (ticksLeft <= 0) {
        const choice = walk.chooseGrinder(snapshot.field.position, snapshot.hero.level);
        stick = choice.stick;
        ticksLeft = choice.ticks;
      }
      const level = snapshot.hero.level;
      const events = sim.act({ type: "move", ...stick, ticks: 1 });
      ticksLeft -= 1;
      if (events.some((event) => event.type === "encounterStarted" && event.miniboss)) {
        bossLevel = level;
      }
      if (sim.observe().mode === "combat") ticksLeft = 0;
      continue;
    }

    const choice = combat.chooseFighter(snapshot.hero);
    const target = snapshot.combat?.mobId ?? "";
    sim.act(
      choice === "potion" ? { type: "item", item: "item.potion" } : { type: "fight", target },
    );
  }
  throw new Error(`seed ${seed} never finished`);
}

/** Walks until the first fight and returns that action's events. */
function walkToFight(
  sim: ReturnType<typeof createSim>,
  choiceRng: SeededRandomGenerator,
): SimEvent[] {
  const walk = new FieldWalkPolicy({
    field: sim.observe().field.map,
    miniboss: sim.observe().field.miniboss.tile,
    rng: choiceRng,
  });
  let stick = { x: 0, y: 0 };
  let ticksLeft = 0;
  for (let step = 0; step < 20_000; step++) {
    const snapshot = sim.observe();
    if (ticksLeft <= 0) {
      const choice = walk.chooseGrinder(snapshot.field.position, snapshot.hero.level);
      stick = choice.stick;
      ticksLeft = choice.ticks;
    }
    const events = sim.act({ type: "move", ...stick, ticks: 1 });
    ticksLeft -= 1;
    if (events.length > 0) return events;
  }
  throw new Error("the walk never started a fight");
}
