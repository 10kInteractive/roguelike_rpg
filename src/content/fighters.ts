import type { EnemyAction, Fighter } from "../sim/combat/fight";
import type { Bundle } from "./schema";

type Mob = Bundle["mobs"]["mobs"][number];
type Spell = Bundle["spells"]["spells"][number];
type Hero = Bundle["hero"];

/**
 * Turns one bundle mob into the enemy `fight` runs.
 *
 * `attack` becomes Fight. A spell id is filled in from the spell list. Grind
 * keeps its multiplier.
 */
export function toEnemy(mob: Mob, spells: readonly Spell[]): Fighter {
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
export function toHero(hero: Hero): Fighter {
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

function toAction(
  action: Mob["actions"][number],
  spells: readonly Spell[],
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
