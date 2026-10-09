import type { Element } from "./damage";

export type HeroVitals = {
  hp: number;
  maxHp: number;
  potions: number;
};

export type KnownSpell = {
  id: "spell.ember" | "spell.frost";
  element: Element;
  power: number;
  cost: number;
};

export type SpellChoice = {
  type: "spell";
  spellId: KnownSpell["id"];
  element: Element;
  power: number;
  cost: number;
};

/**
 * The fighter's combat choice.
 *
 * Drink when HP is below 30% of maximum and a potion remains. Otherwise Fight.
 * Exactly 30% is a Fight.
 */
export function fighterAction(hero: HeroVitals): "fight" | "potion" {
  if (hero.potions > 0 && hero.hp * 10 < hero.maxHp * 3) return "potion";
  return "fight";
}

/**
 * The caster's combat choice.
 *
 * Cast the known spell that matches the target's weakness, while MP can pay
 * for it. Otherwise Fight. A target with no weakness is a Fight.
 */
export function casterAction(
  hero: { mp: number },
  target: { weak?: Element },
  spells: readonly KnownSpell[],
): "fight" | SpellChoice {
  const spell = spells.find((entry) => entry.element === target.weak);
  if (!spell || hero.mp < spell.cost) return "fight";
  return {
    type: "spell",
    spellId: spell.id,
    element: spell.element,
    power: spell.power,
    cost: spell.cost,
  };
}
