import fs from "node:fs";
import path from "node:path";
import { enemyFighterFromMob, heroFighterFromBundle } from "../src/content/fighters.ts";
import { loadBundle } from "../src/content/load.ts";
import {
  combatRulesFromBundle,
  knownSpellsFromBundle,
  levelRulesFromBundle,
  runMobsFromBundle,
} from "../src/content/rules.ts";
import type { Bundle } from "../src/content/schema.ts";
import { formatCombatSeedSweepSummary } from "../src/harness/combat-sweep.ts";
import type { SweepFight } from "../src/harness/combat-sweep.types.ts";
import { formatGrinderFieldSweepSummary } from "../src/harness/field-sweep.ts";
import {
  expandLoggedActionsIntoFightScript,
  type FightOutcome,
  hashFightEventList,
  type LoggedAction,
  readFightOutcomeFromEvents,
  readLoggedActionsFromFightEvents,
} from "../src/harness/replay.ts";
import { OneOnOneFightController } from "../src/sim/combat/fight.controller.ts";
import type { FightEvent } from "../src/sim/combat/fight.types.ts";
import { CombatActionPolicy } from "../src/sim/combat/policy.controller.ts";
import type { KnownSpell } from "../src/sim/combat/policy.types.ts";
import type { EncounterTables } from "../src/sim/field/encounters.types.ts";
import { createSeededMeadow } from "../src/sim/field/map.ts";
import { GrinderFieldRunController } from "../src/sim/run/run.controller.ts";
import { SeededRandomGenerator } from "../src/sim/utils/rng.controller.ts";
import { readBundle } from "./read-bundle.ts";

const replayPath = flag("replay");
if (replayPath) {
  const log = readLog(replayPath);
  const bundle = loadBundle(await readBundle(path.resolve("prototypes/one/bundle")));
  const events = play(bundle, log.enemyId, log.seed, log.actions);
  const hash = hashFightEventList(events);
  if (hash !== log.hash) {
    console.error(`replay mismatch ${hash} ${log.hash}`);
    process.exit(1);
  }
  console.log(`replay ok ${hash}`);
  process.exit(0);
}

const seed = flag("seed");
const runs = flag("runs");
const enemyId = flag("enemy") ?? "mob.slime";
const policy = flag("policy") ?? "fighter";
const outPath = flag("out");
const policyOk = policy === "fighter" || policy === "caster" || policy === "random";
if (runs !== undefined && policy === "grinder") {
  if (seed !== undefined || !/^[1-9]\d*$/.test(runs)) {
    console.error("Usage: npm run sim -- --policy grinder --runs 1000");
    process.exit(1);
  }
  const bundle = loadBundle(await readBundle(path.resolve("prototypes/one/bundle")));
  console.log(sweepGrinder(bundle, Number(runs)));
  process.exit(0);
}
if (runs !== undefined) {
  if (seed !== undefined || !/^[1-9]\d*$/.test(runs) || !policyOk) {
    console.error(
      "Usage: npm run sim -- --runs 1000 [--enemy mob.slime] [--policy fighter|caster|random]",
    );
    process.exit(1);
  }
  const bundle = loadBundle(await readBundle(path.resolve("prototypes/one/bundle")));
  const spells = knownSpellsFromBundle(bundle);
  const fought: SweepFight[] = [];
  for (let next = 1; next <= Number(runs); next++) {
    const events = play(bundle, enemyId, next, undefined, {
      combat: new SeededRandomGenerator(next),
      choice: new SeededRandomGenerator(next),
      policy,
      spells,
    });
    fought.push({ enemyId, outcome: readFightOutcomeFromEvents(events, bundle.hero.id) });
  }
  console.log(formatCombatSeedSweepSummary(fought));
  process.exit(0);
}

if (seed === undefined || !/^\d+$/.test(seed) || !policyOk) {
  console.error(
    "Usage: npm run sim -- --seed 42 [--enemy mob.slime] [--policy fighter|caster|random] [--out runs/42.json]",
  );
  console.error(
    "       npm run sim -- --runs 1000 [--enemy mob.slime] [--policy fighter|caster|random]",
  );
  console.error("       npm run sim -- --policy grinder --runs 1000");
  console.error("       npm run sim -- --replay runs/42.json");
  process.exit(1);
}

const bundle = loadBundle(await readBundle(path.resolve("prototypes/one/bundle")));
const combat = new SeededRandomGenerator(Number(seed));
const choice = new SeededRandomGenerator(Number(seed));
const spells = knownSpellsFromBundle(bundle);
const events = play(bundle, enemyId, Number(seed), undefined, {
  combat,
  choice,
  policy,
  spells,
});

for (const event of events) console.log(JSON.stringify(event));

if (outPath) {
  const log: RunLog = {
    seed: Number(seed),
    bundleId: bundle.manifest.id,
    bundleVersion: bundle.manifest.version,
    enemyId,
    policy,
    actions: readLoggedActionsFromFightEvents(events, bundle.hero.id),
    outcome: readFightOutcomeFromEvents(events, bundle.hero.id),
    hash: hashFightEventList(events),
  };
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outPath), `${JSON.stringify(log, null, 2)}\n`);
  console.error(`wrote ${outPath} ${log.hash}`);
}

type RunLog = {
  seed: number;
  bundleId: string;
  bundleVersion: number;
  enemyId: string;
  policy: string;
  actions: { hero: LoggedAction[]; enemy: LoggedAction[] };
  outcome: FightOutcome;
  hash: string;
};

function play(
  bundle: Bundle,
  enemyId: string,
  seed: number,
  actions?: { hero: LoggedAction[]; enemy: LoggedAction[] },
  live?: {
    combat: SeededRandomGenerator;
    choice: SeededRandomGenerator;
    policy: string;
    spells: KnownSpell[];
  },
): FightEvent[] {
  const mob = bundle.mobs.mobs.find((entry) => entry.id === enemyId);
  if (!mob) {
    console.error(`Unknown enemy ${enemyId}`);
    process.exit(1);
  }
  const spells = live?.spells ?? knownSpellsFromBundle(bundle);
  const recorded = actions ? expandLoggedActionsIntoFightScript(actions.hero, spells) : undefined;
  const enemyActions = actions
    ? expandLoggedActionsIntoFightScript(actions.enemy, spells)
    : undefined;
  const policy = new CombatActionPolicy(spells, live?.choice ?? new SeededRandomGenerator(seed));
  return new OneOnOneFightController({
    hero: heroFighterFromBundle(bundle.hero),
    enemy: enemyFighterFromMob(mob, bundle.spells.spells),
    rng: live?.combat ?? new SeededRandomGenerator(seed),
    choiceRng: actions ? undefined : live?.choice,
    ...combatRulesFromBundle(bundle),
    leveling: levelRulesFromBundle(bundle),
    heroActions: recorded,
    enemyActions,
    heroPolicy: actions
      ? undefined
      : live?.policy === "caster"
        ? (hero, target) => policy.chooseCaster(hero, target)
        : live?.policy === "random"
          ? (hero) => policy.chooseRandom(hero)
          : (hero) => policy.chooseFighter(hero),
  }).resolve();
}

function readLog(file: string): RunLog {
  const value: unknown = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
  if (!isRunLog(value)) {
    console.error(`Not a run log: ${file}`);
    process.exit(1);
  }
  return value;
}

function isRunLog(value: unknown): value is RunLog {
  if (typeof value !== "object" || value === null) return false;
  const log = value as RunLog;
  return (
    typeof log.seed === "number" &&
    typeof log.enemyId === "string" &&
    typeof log.hash === "string" &&
    Array.isArray(log.actions?.hero) &&
    Array.isArray(log.actions?.enemy)
  );
}

function sweepGrinder(bundle: Bundle, runs: number): string {
  const biome = bundle.biomes[0];
  if (!biome) throw new Error("The bundle has no biome");
  const mobs = runMobsFromBundle(bundle);
  const combat = combatRulesFromBundle(bundle);
  const leveling = levelRulesFromBundle(bundle);
  const tables = encounterTables(bundle);
  const results = [];
  for (let next = 1; next <= runs; next++) {
    const map = createSeededMeadow({
      seed: next,
      width: biome.width,
      height: biome.height,
      minibossDistance: biome.minibossDistance,
    });
    results.push(
      new GrinderFieldRunController({
        seed: next,
        map,
        miniboss: { tile: map.miniboss, radius: biome.minibossRadius, id: biome.miniboss },
        tables,
        minDistance: bundle.rules.minEncounterDistance,
        hero: heroFighterFromBundle(bundle.hero),
        mobs,
        combat,
        leveling,
      }).play(),
    );
  }
  return formatGrinderFieldSweepSummary(results);
}

function encounterTables(bundle: Bundle): EncounterTables {
  const tables: EncounterTables = {};
  for (const terrain of bundle.encounters.terrains) {
    const name = terrain.id.slice("terrain.".length);
    if (name !== "grass" && name !== "forest" && name !== "path") continue;
    tables[name] = {
      rate: terrain.rate,
      packs: terrain.packs.map((pack) => ({
        weight: pack.weight,
        groups: pack.groups.map((group) => ({
          id: group.id,
          min: group.min,
          max: group.max,
        })),
      })),
    };
  }
  return tables;
}

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}
