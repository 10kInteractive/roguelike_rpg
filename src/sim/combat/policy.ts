import type { Rng } from "../rng";
import type { Element } from "./damage";

/** What the fighter looks at before choosing Fight or a potion. */
export type HeroVitals = {
  /** Hit points right now. */
  hp: number;
  /** Hit points a potion fills toward. */
  maxHp: number;
  /** Potions still carried. */
  potions: number;
};

/** A spell the hero has learned. */
export type KnownSpell = {
  /** `spell.ember` or `spell.frost`. */
  id: "spell.ember" | "spell.frost";
  /** Fire or ice. */
  element: Element;
  /** Added to MAG before the element multiplier. */
  power: number;
  /** Magic points the cast spends. */
  cost: number;
};

/** A cast the hero or a policy chose for this turn. */
export type SpellChoice = {
  /** This turn is a cast, not Fight, Defend, a potion, or Run. */
  type: "spell";
  /** Which spell. */
  spellId: KnownSpell["id"];
  /** Fire or ice. */
  element: Element;
  /** Added to MAG before the element multiplier. */
  power: number;
  /** Magic points the cast spends. An unpaid cast becomes Fight. */
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

/**
 * A crash-finding combat choice.
 *
 * One roll picks among Fight, Defend, Flee, a potion when one is left, and
 * each known spell the hero can pay for. The roll is the fight's own RNG.
 */
export function randomAction(
  hero: { mp: number; potions: number },
  spells: readonly KnownSpell[],
  rng: Rng,
): "fight" | "defend" | "potion" | "flee" | SpellChoice {
  const legal: ("fight" | "defend" | "potion" | "flee" | SpellChoice)[] = ["fight", "defend"];
  if (hero.potions > 0) legal.push("potion");
  legal.push("flee");

  for (const spell of spells) {
    if (hero.mp < spell.cost) continue;
    legal.push({
      type: "spell",
      spellId: spell.id,
      element: spell.element,
      power: spell.power,
      cost: spell.cost,
    });
  }

  const index = Math.floor(rng.next() * legal.length);
  return legal[index] ?? "fight";
}
