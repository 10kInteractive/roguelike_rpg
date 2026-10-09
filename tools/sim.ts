import fs from "node:fs";
import path from "node:path";
import { toEnemy, toHero } from "../src/content/fighters.ts";
import { loadBundle } from "../src/content/load.ts";
import type { Bundle } from "../src/content/schema.ts";
import { type FightEvent, fight } from "../src/sim/combat/fight.ts";
import {
  casterAction,
  fighterAction,
  type KnownSpell,
  randomAction,
} from "../src/sim/combat/policy.ts";
import {
  actionsFrom,
  eventHash,
  type FightOutcome,
  type LoggedAction,
  outcomeFrom,
  toScript,
} from "../src/sim/harness/replay.ts";
import { type SweepFight, sweepSummary } from "../src/sim/harness/sweep.ts";
import { createRng } from "../src/sim/rng.ts";
import { readBundle } from "./read-bundle.ts";

const replayPath = flag("replay");
if (replayPath) {
  const log = readLog(replayPath);
  const bundle = loadBundle(await readBundle(path.resolve("prototypes/one/bundle")));
  const events = play(bundle, log.enemyId, log.seed, log.actions);
  const hash = eventHash(events);
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
if (runs !== undefined) {
  if (seed !== undefined || !/^[1-9]\d*$/.test(runs) || !policyOk) {
    console.error(
      "Usage: npm run sim -- --runs 1000 [--enemy mob.slime] [--policy fighter|caster|random]",
    );
    process.exit(1);
  }
  const bundle = loadBundle(await readBundle(path.resolve("prototypes/one/bundle")));
  const spells = knownSpells(bundle);
  const fought: SweepFight[] = [];
  for (let next = 1; next <= Number(runs); next++) {
    const events = play(bundle, enemyId, next, undefined, {
      combat: createRng(next),
      choice: createRng(next),
      policy,
      spells,
    });
    fought.push({ enemyId, outcome: outcomeFrom(events, bundle.hero.id) });
  }
  console.log(sweepSummary(fought));
  process.exit(0);
}

if (seed === undefined || !/^\d+$/.test(seed) || !policyOk) {
  console.error(
    "Usage: npm run sim -- --seed 42 [--enemy mob.slime] [--policy fighter|caster|random] [--out runs/42.json]",
  );
  console.error(
    "       npm run sim -- --runs 1000 [--enemy mob.slime] [--policy fighter|caster|random]",
  );
  console.error("       npm run sim -- --replay runs/42.json");
  process.exit(1);
}

const bundle = loadBundle(await readBundle(path.resolve("prototypes/one/bundle")));
const combat = createRng(Number(seed));
const choice = createRng(Number(seed));
const spells = knownSpells(bundle);
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
    actions: actionsFrom(events, bundle.hero.id),
    outcome: outcomeFrom(events, bundle.hero.id),
    hash: eventHash(events),
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
    combat: ReturnType<typeof createRng>;
    choice: ReturnType<typeof createRng>;
    policy: string;
    spells: KnownSpell[];
  },
): FightEvent[] {
  const mob = bundle.mobs.mobs.find((entry) => entry.id === enemyId);
  if (!mob) {
    console.error(`Unknown enemy ${enemyId}`);
    process.exit(1);
  }
  const potion = bundle.items.items.find((item) => item.id === "item.potion");
  const spells = live?.spells ?? knownSpells(bundle);
  const recorded = actions ? toScript(actions.hero, spells) : undefined;
  const enemyActions = actions ? toScript(actions.enemy, spells) : undefined;
  return fight({
    hero: toHero(bundle.hero),
    enemy: toEnemy(mob, bundle.spells.spells),
    rng: live?.combat ?? createRng(seed),
    choiceRng: actions ? undefined : live?.choice,
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
    heroActions: recorded,
    enemyActions,
    heroPolicy: actions
      ? undefined
      : live?.policy === "caster"
        ? (hero, target) => casterAction(hero, target, spells)
        : live?.policy === "random"
          ? (hero) => randomAction(hero, spells, live.choice)
          : fighterAction,
  });
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
