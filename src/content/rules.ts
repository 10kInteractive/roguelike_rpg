import type { KnownSpell } from "../sim/combat/policy.types";
import type { LevelRules } from "../sim/combat/utils/level.types";
import type { EncounterTables } from "../sim/field/encounters.types";
import type { CombatRules, RunMob } from "../sim/run/run.types";
import { enemyFighterFromMob } from "./fighters";
import type { Bundle } from "./schema";

/** The bundle's damage, flee, and potion numbers, as every fight takes them. */
export function combatRulesFromBundle(bundle: Bundle): CombatRules {
  const potion = bundle.items.items.find((item) => item.id === "item.potion");
  return {
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
  };
}

/** XP per level, the level cap, and the hero's growth per level. */
export function levelRulesFromBundle(bundle: Bundle): LevelRules {
  return {
    xpPerLevel: bundle.rules.xpPerLevel,
    levelCap: bundle.rules.levelCap,
    growth: bundle.hero.growth,
  };
}

/** The hero's spells with their element, power, and cost. Prototype one knows Ember and Frost. */
export function knownSpellsFromBundle(bundle: Bundle): KnownSpell[] {
  return bundle.hero.spells.flatMap((id) => {
    const spell = bundle.spells.spells.find((entry) => entry.id === id);
    if (!spell || (spell.id !== "spell.ember" && spell.id !== "spell.frost")) return [];
    return [{ id: spell.id, element: spell.element, power: spell.power, cost: spell.cost }];
  });
}

/** Each walkable terrain's encounter rate and packs. Water and mountain never roll. */
export function encounterTablesFromBundle(bundle: Bundle): EncounterTables {
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

/** Every mob as a fight's enemy, with its potion drop, by mob id. */
export function runMobsFromBundle(bundle: Bundle): Map<string, RunMob> {
  return new Map(
    bundle.mobs.mobs.map((mob) => [
      mob.id,
      { fighter: enemyFighterFromMob(mob, bundle.spells.spells), potionDrop: mob.potionDrop },
    ]),
  );
}
