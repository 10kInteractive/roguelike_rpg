import path from "node:path";
import { toEnemy, toHero } from "../src/content/fighters.ts";
import { loadBundle } from "../src/content/load.ts";
import type { Bundle } from "../src/content/schema.ts";
import { fight } from "../src/sim/fight.ts";
import { casterAction, fighterAction, type KnownSpell } from "../src/sim/policy.ts";
import { createRng } from "../src/sim/rng.ts";
import { readBundle } from "./read-bundle.ts";

const seed = flag("seed");
const enemyId = flag("enemy") ?? "mob.slime";
const policy = flag("policy") ?? "fighter";
if (seed === undefined || !/^\d+$/.test(seed) || (policy !== "fighter" && policy !== "caster")) {
  console.error("Usage: npm run sim -- --seed 42 [--enemy mob.slime] [--policy fighter|caster]");
  process.exit(1);
}

const bundle = loadBundle(await readBundle(path.resolve("prototypes/one/bundle")));
const mob = bundle.mobs.mobs.find((entry) => entry.id === enemyId);
if (!mob) {
  console.error(`Unknown enemy ${enemyId}`);
  process.exit(1);
}

const potion = bundle.items.items.find((item) => item.id === "item.potion");
const events = fight({
  hero: toHero(bundle.hero),
  enemy: toEnemy(mob, bundle.spells.spells),
  rng: createRng(Number(seed)),
  turnBase: bundle.rules.turnBase,
  spreadMin: bundle.rules.spreadMin,
  spreadMax: bundle.rules.spreadMax,
  critChance: bundle.rules.critChance,
  critMultiplier: bundle.rules.critMultiplier,
  defendMultiplier: bundle.rules.defendMultiplier,
  potionHeal: potion?.heal ?? 0,
  fleeBase: bundle.rules.fleeBase,
  fleePerPoint: bundle.rules.fleePerPoint,
  fleeMin: bundle.rules.fleeMin,
  fleeMax: bundle.rules.fleeMax,
  weaknessMultiplier: bundle.rules.weaknessMultiplier,
  resistanceMultiplier: bundle.rules.resistanceMultiplier,
  leveling: {
    xpPerLevel: bundle.rules.xpPerLevel,
    levelCap: bundle.rules.levelCap,
    growth: bundle.hero.growth,
  },
  heroPolicy:
    policy === "caster"
      ? (hero, target) => casterAction(hero, target, knownSpells(bundle))
      : fighterAction,
});

for (const event of events) console.log(JSON.stringify(event));

function knownSpells(bundle: Bundle): KnownSpell[] {
  return bundle.hero.spells.flatMap((id) => {
    const spell = bundle.spells.spells.find((entry) => entry.id === id);
    if (!spell || (spell.id !== "spell.ember" && spell.id !== "spell.frost")) return [];
    return [{ id: spell.id, element: spell.element, power: spell.power, cost: spell.cost }];
  });
}

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}
