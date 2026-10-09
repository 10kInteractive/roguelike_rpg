import type { EnemyAction, Fighter } from "../sim/combat/fight.types";
import type { BundleHero, BundleMob, BundleSpell } from "./fighters.types";

/**
 * Turns one bundle mob into the enemy a fight plays against.
 *
 * `attack` becomes Fight. A spell id is filled in from the spell list. Grind
 * keeps its multiplier.
 */
export function enemyFighterFromMob(mob: BundleMob, spells: readonly BundleSpell[]): Fighter {
  return {
    id: mob.id,
    hp: mob.hp,
    maxHp: mob.hp,
    mp: mob.mp ?? 0,
    maxMp: mob.mp ?? 0,
    str: mob.str,
    def: mob.def,
    mag: mob.mag,
    haste: mob.haste,
    weak: mob.weak,
    resists: mob.resists,
    xpReward: mob.xp,
    miniboss: mob.miniboss,
    actions: mob.actions.map((action) => toAction(action, spells, mob.id)),
  };
}

/** Strider at level 1, with the potion stack from the hero file. */
export function heroFighterFromBundle(hero: BundleHero): Fighter {
  const potions = hero.items.find((item) => item.id === "item.potion")?.count ?? 0;
  return {
    id: hero.id,
    hp: hero.hp,
    maxHp: hero.hp,
    mp: hero.mp,
    maxMp: hero.mp,
    str: hero.str,
    def: hero.def,
    mag: hero.mag,
    haste: hero.haste,
    potions,
    hero: true,
    level: 1,
    xp: 0,
  };
}

/** One bundle action as the fight's enemy action. A spell id gets its power and cost. */
function toAction(
  action: BundleMob["actions"][number],
  spells: readonly BundleSpell[],
  mobId: string,
): EnemyAction {
  if (action.type === "attack") return { type: "fight", weight: action.weight };
  if (action.type === "grind") {
    return { type: "grind", multiplier: action.multiplier, weight: action.weight };
  }

  const spell = spells.find((entry) => entry.id === action.spell);
  if (!spell) throw new Error(`Unknown spell "${action.spell}" on ${mobId}`);
  if (spell.id !== "spell.ember" && spell.id !== "spell.frost") {
    throw new Error(`Unknown spell "${spell.id}" on ${mobId}`);
  }
  return {
    type: "spell",
    spellId: spell.id,
    element: spell.element,
    power: spell.power,
    cost: spell.cost,
    weight: action.weight,
  };
}
