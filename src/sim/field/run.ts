import { OneOnOneFightController } from "../combat/fight.controller";
import type { FightEvent, Fighter } from "../combat/fight.types";
import type { LevelRules } from "../combat/level";
import { fighterAction } from "../combat/policy";
import { type Rng, SeededRandomGenerator } from "../rng";
import { EncounterWalkController } from "./encounters.controller";
import type { EncounterTables, Miniboss } from "./encounters.types";
import type { MeadowMap } from "./map";
import { tilesPerSecond } from "./movement";
import { grinderWalk } from "./policy";

/** Seconds a player spends choosing the hero's action. */
export const heroDecisionSeconds = 3;

/** Seconds a player spends watching an enemy action. */
export const enemyActionSeconds = 1.5;

/** Seconds between the field and a fight, and back. */
export const fightTransitionSeconds = 2;

/** A mob the field can start a fight with, plus its potion drop. */
export type RunMob = {
  /** Stats and actions `fight` uses. */
  fighter: Fighter;
  /** Drop chance after a win. A missing chance never drops. */
  potionDrop?: number;
};

/** What one grinder run is worth to the balance sweep. */
export type FieldRunResult = {
  /** Win when the miniboss falls. Lose when the hero falls. */
  outcome: "win" | "lose";
  /** Level when the miniboss fight started. Absent if the hero never arrived. */
  bossLevel?: number;
  /** Fights started, including a flee and the miniboss. */
  fights: number;
  /** Tiles the hero actually walked. */
  distance: number;
  /** Estimated seconds, from decisions, enemy actions, fights, and walking. */
  playSeconds: number;
  /** Potions the hero drank. */
  potionsUsed: number;
  /** Mob that defeated the hero. */
  killedBy?: string;
};

/** The hero as the run carries them from one fight to the next. */
type HeroState = {
  /** Id written on the hero's events. */
  id: string;
  /** Hit points right now. */
  hp: number;
  /** Hit points a heal or a level-up fills to. */
  maxHp: number;
  /** Magic points right now. */
  mp: number;
  /** Magic points a level-up fills to. */
  maxMp: number;
  /** Strength. */
  str: number;
  /** Defense. */
  def: number;
  /** Magic. */
  mag: number;
  /** How quickly the hero's turn comes back around. */
  haste: number;
  /** Potions still carried. */
  potions: number;
  /** Current level. */
  level: number;
  /** XP toward the next level. */
  xp: number;
};

/** Damage, flee, and potion numbers copied from the bundle for each fight. */
type CombatRules = {
  /** Time added per action before dividing by haste. */
  turnBase: number;
  /** Inclusive lower bound of the damage spread. */
  spreadMin: number;
  /** Exclusive upper bound of the damage spread. */
  spreadMax: number;
  /** A hit crits when the roll is below this. */
  critChance: number;
  /** Applied to a crit, then rounded down. */
  critMultiplier: number;
  /** Applied to damage taken while defending, then rounded down. */
  defendMultiplier: number;
  /** Hit points restored by one potion, before the maximum. */
  potionHeal: number;
  /** Flee chance before the haste bonus. */
  fleeBase: number;
  /** Added per point of hero haste over the enemy's haste. */
  fleePerPoint: number;
  /** Lowest flee chance. */
  fleeMin: number;
  /** Highest flee chance. */
  fleeMax: number;
  /** Magic damage multiplier against a weakness. */
  weaknessMultiplier: number;
  /** Magic damage multiplier against a resistance. */
  resistanceMultiplier: number;
};

/** How many stick holds a run may take before it gives up. A finished run stops sooner. */
const maxBatches = 20_000;

/**
 * Plays one grinder run on a meadow.
 *
 * The grinder wanders until level 5, then walks to the miniboss. Each pack is
 * fought one mob at a time. The run ends when the miniboss falls or the hero does.
 */
export function runField(input: {
  /** Seed for the field rolls, the choice rolls, and the combat rolls. */
  seed: number;
  /** Meadow the hero crosses, including the spawn tile. */
  map: MeadowMap;
  /** Circle that starts the miniboss fight. */
  miniboss: Miniboss;
  /** Encounter rate and packs for grass, forest, and path. */
  tables: EncounterTables;
  /** Tiles that must pass between fights. */
  minDistance: number;
  /** Strider at the start of the run. */
  hero: Fighter;
  /** Every mob an encounter can name. */
  mobs: ReadonlyMap<string, RunMob>;
  /** Damage, flee, and potion numbers for each fight. */
  combat: CombatRules;
  /** XP thresholds and growth. */
  leveling: LevelRules;
  /** Field, choice, and combat rolls. Defaults to three generators from `seed`. */
  rngs?: {
    /** Encounter rates, pack picks, counts, and potion drops. */
    field: Rng;
    /** Wander directions and enemy action picks. */
    choice: Rng;
    /** Damage, crits, and flee rolls. */
    combat: Rng;
  };
}): FieldRunResult {
  const hero = copyHero(input.hero);
  const fieldRng = input.rngs?.field ?? new SeededRandomGenerator(input.seed);
  const choiceRng = input.rngs?.choice ?? new SeededRandomGenerator(input.seed);
  const combatRng = input.rngs?.combat ?? new SeededRandomGenerator(input.seed);
  const encounter = new EncounterWalkController({
    position: { x: input.map.spawn.x + 0.5, y: input.map.spawn.y + 0.5 },
    field: input.map,
    tables: input.tables,
    minDistance: input.minDistance,
    rng: fieldRng,
    miniboss: input.miniboss,
  });
  let distance = 0;
  let fights = 0;
  let heroActions = 0;
  let enemyActions = 0;
  let potionsUsed = 0;
  let bossLevel: number | undefined;

  for (let batch = 0; batch < maxBatches && hero.hp > 0; batch++) {
    // Hold the grinder's stick, and stop early when a fight starts.
    const choice = grinderWalk({
      position: encounter.position,
      field: input.map,
      miniboss: input.miniboss.tile,
      level: hero.level,
      rng: choiceRng,
    });
    const stepped = encounter.holdStick(choice.stick, choice.ticks);
    distance += stepped.distance;
    const started = stepped.events[0];
    if (!started) continue;

    if (started.miniboss) bossLevel = hero.level;

    // One mob at a time. A flee or a defeat ends the pack.
    let packOver = false;
    for (const group of started.groups) {
      for (let count = 0; count < group.count; count++) {
        const mob = input.mobs.get(group.id);
        if (!mob) throw new Error(`Unknown mob "${group.id}"`);
        const events = new OneOnOneFightController({
          hero: { ...hero, hero: true },
          enemy: mob.fighter,
          rng: combatRng,
          choiceRng,
          ...input.combat,
          leveling: input.leveling,
          heroPolicy: fighterAction,
        }).resolve();
        fights += 1;
        const actions = countActions(events, hero.id);
        heroActions += actions.hero;
        enemyActions += actions.enemy;
        const outcome = outcomeOf(events, hero.id);
        applyFight(hero, events, input.leveling);
        potionsUsed += actions.potions;

        if (outcome === "lose") {
          return toFieldResult({
            outcome: "lose",
            bossLevel,
            fights,
            distance,
            heroActions,
            enemyActions,
            potionsUsed,
            killedBy: group.id,
          });
        }
        if (outcome === "flee") {
          packOver = true;
          break;
        }
        if (mob.potionDrop !== undefined && fieldRng.next() < mob.potionDrop) hero.potions += 1;
        if (started.miniboss) {
          return toFieldResult({
            outcome: "win",
            bossLevel,
            fights,
            distance,
            heroActions,
            enemyActions,
            potionsUsed,
          });
        }
      }
      if (packOver) break;
    }
  }

  return toFieldResult({
    outcome: "lose",
    bossLevel,
    fights,
    distance,
    heroActions,
    enemyActions,
    potionsUsed,
  });
}

/** The sweep's row for this run, including the estimated play time. */
function toFieldResult(run: {
  outcome: "win" | "lose";
  bossLevel?: number;
  fights: number;
  distance: number;
  heroActions: number;
  enemyActions: number;
  potionsUsed: number;
  killedBy?: string;
}): FieldRunResult {
  const playSeconds =
    run.heroActions * heroDecisionSeconds +
    run.enemyActions * enemyActionSeconds +
    run.fights * fightTransitionSeconds +
    run.distance / tilesPerSecond;
  return {
    outcome: run.outcome,
    bossLevel: run.bossLevel,
    fights: run.fights,
    distance: run.distance,
    playSeconds,
    potionsUsed: run.potionsUsed,
    killedBy: run.killedBy,
  };
}

/** The hero at the start of the run, with the defaults filled in. */
function copyHero(hero: Fighter): HeroState {
  const mp = hero.mp ?? 0;
  return {
    id: hero.id,
    hp: hero.hp,
    maxHp: hero.maxHp ?? hero.hp,
    mp,
    maxMp: hero.maxMp ?? mp,
    str: hero.str,
    def: hero.def,
    mag: hero.mag ?? 0,
    haste: hero.haste,
    potions: hero.potions ?? 0,
    level: hero.level ?? 1,
    xp: hero.xp ?? 0,
  };
}

/** Writes the fight's last HP, MP, potions, and level back onto the hero. */
function applyFight(hero: HeroState, events: readonly FightEvent[], rules: LevelRules): void {
  for (const event of events) {
    if (event.type === "damaged" && event.targetId === hero.id) hero.hp = event.targetHp;
    if (event.type === "itemUsed" && event.actorId === hero.id) {
      hero.hp = event.hp;
      hero.potions = event.remaining;
    }
    if (event.type === "spellCast" && event.actorId === hero.id) hero.mp = event.mp;
    if (event.type === "xpGained") {
      hero.xp = event.xp;
      hero.level = event.level;
    }
    if (event.type === "levelUp") {
      hero.xp -= rules.xpPerLevel * (event.level - 1);
      hero.level = event.level;
      hero.hp = event.hp;
      hero.maxHp = event.maxHp;
      hero.mp = event.mp;
      hero.maxMp = event.maxMp;
      hero.str = event.str;
      hero.def = event.def;
      hero.mag = event.mag;
      hero.haste = event.haste;
    }
  }
}

/** Hero decisions, enemy actions, and potions drunk in one fight. */
function countActions(
  events: readonly FightEvent[],
  heroId: string,
): { hero: number; enemy: number; potions: number } {
  let hero = 0;
  let enemy = 0;
  let potions = 0;
  for (const event of events) {
    if (event.type === "itemUsed" && event.actorId === heroId) potions += 1;
    if (!("actorId" in event)) continue;
    if (
      event.type !== "attacked" &&
      event.type !== "defended" &&
      event.type !== "itemUsed" &&
      event.type !== "spellCast" &&
      event.type !== "fleeAttempted" &&
      event.type !== "grind"
    ) {
      continue;
    }
    if (event.actorId === heroId) hero += 1;
    else enemy += 1;
  }
  return { hero, enemy, potions };
}

/** Win when an enemy falls, flee when the hero escapes, lose when the hero falls. */
function outcomeOf(events: readonly FightEvent[], heroId: string): "win" | "lose" | "flee" {
  for (const event of events) {
    if (event.type === "fleeAttempted" && event.success) return "flee";
    if (event.type === "actorDefeated") return event.actorId === heroId ? "lose" : "win";
  }
  return "lose";
}
