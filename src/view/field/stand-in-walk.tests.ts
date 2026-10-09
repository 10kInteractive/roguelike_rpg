import { expect, test } from "vitest";
import assets from "../../../prototypes/one/bundle/assets.json" with { type: "json" };
import biome from "../../../prototypes/one/bundle/biome.meadow.json" with { type: "json" };
import manifest from "../../../prototypes/one/bundle/bundle.json" with { type: "json" };
import encounters from "../../../prototypes/one/bundle/encounters.json" with { type: "json" };
import hero from "../../../prototypes/one/bundle/hero.json" with { type: "json" };
import items from "../../../prototypes/one/bundle/items.json" with { type: "json" };
import mobs from "../../../prototypes/one/bundle/mobs.json" with { type: "json" };
import rules from "../../../prototypes/one/bundle/rules.json" with { type: "json" };
import spells from "../../../prototypes/one/bundle/spells.json" with { type: "json" };
import { heroFighterFromBundle } from "../../content/fighters";
import { loadBundle } from "../../content/load";
import {
  combatRulesFromBundle,
  encounterTablesFromBundle,
  levelRulesFromBundle,
  runMobsFromBundle,
} from "../../content/rules";
import { CombatActionPolicy } from "../../sim/combat/policy.controller";
import { createSeededMeadow } from "../../sim/field/map";
import { PackFightController } from "../../sim/run/pack.controller";
import { GrinderFieldRunController } from "../../sim/run/run.controller";
import { SeededRandomGenerator } from "../../sim/utils/rng.controller";
import { StandInWalkController } from "./stand-in-walk.controller";

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

/** The run's setup for one seed, the same way the sweep builds it. */
function setup(seed: number) {
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

/** Walks one tick at a time and fights each pack, until the miniboss or the hero falls. */
function walkTickByTick(seed: number) {
  const input = setup(seed);
  const fieldRng = new SeededRandomGenerator(seed);
  const choiceRng = new SeededRandomGenerator(seed);
  const policy = new CombatActionPolicy([], choiceRng);
  const packs = new PackFightController({
    ...input,
    heroPolicy: (fighter) => policy.chooseFighter(fighter),
    rngs: { drops: fieldRng, choice: choiceRng, combat: new SeededRandomGenerator(seed) },
  });
  const walk = new StandInWalkController({ ...input, fieldRng, choiceRng });

  let distance = 0;
  let fights = 0;
  let bossLevel: number | undefined;
  for (let tick = 0; tick < 200_000; tick++) {
    const step = walk.step(packs.hero().level);
    distance += step.distance;
    if (!step.encounter) continue;

    if (step.encounter.miniboss) bossLevel = packs.hero().level;
    const result = packs.fight(step.encounter.groups, step.encounter.miniboss);
    fights += result.fights.length;
    if (result.outcome === "lose") {
      return {
        outcome: "lose",
        fights,
        distance,
        bossLevel,
        killedBy: result.fights.at(-1)?.mobId,
      };
    }
    if (result.outcome === "win" && step.encounter.miniboss) {
      return { outcome: "win", fights, distance, bossLevel, killedBy: undefined };
    }
  }
  throw new Error(`seed ${seed} never finished`);
}

test("a seed walks and fights the same, one tick at a time, as the headless grinder run", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const headless = new GrinderFieldRunController(setup(seed)).play();
    const onScreen = walkTickByTick(seed);

    expect(onScreen.outcome, `seed ${seed}`).toBe(headless.outcome);
    expect(onScreen.fights, `seed ${seed}`).toBe(headless.fights);
    expect(onScreen.distance, `seed ${seed}`).toBeCloseTo(headless.distance, 9);
    expect(onScreen.bossLevel, `seed ${seed}`).toBe(headless.bossLevel);
    expect(onScreen.killedBy, `seed ${seed}`).toBe(headless.killedBy);
  }
});
