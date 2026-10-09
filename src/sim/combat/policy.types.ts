import type { Element } from "./utils/damage.types";

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
