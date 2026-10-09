import type { Rng } from "../utils/rng.types";
import type { Element } from "./damage";
import type { HeroVitals, KnownSpell, SpellChoice } from "./policy.types";

/** How a robot hero chooses each combat turn: the fighter, the caster, or random. */
export class CombatActionPolicy {
  /** Spells the hero has learned. */
  private readonly spells: readonly KnownSpell[];

  /** Rolls for the random choice. */
  private readonly rng: Rng;

  /**
   * @param spells Spells the hero has learned. The fighter ignores them.
   * @param rng Rolls for the random choice. The fighter and the caster spend none.
   */
  constructor(spells: readonly KnownSpell[], rng: Rng) {
    this.spells = spells;
    this.rng = rng;
  }

  /**
   * The fighter's combat choice.
   *
   * Drink when HP is below 30% of maximum and a potion remains. Otherwise Fight.
   * Exactly 30% is a Fight.
   */
  chooseFighter(hero: HeroVitals): "fight" | "potion" {
    if (hero.potions > 0 && hero.hp * 10 < hero.maxHp * 3) return "potion";
    return "fight";
  }

  /**
   * The caster's combat choice.
   *
   * Cast the known spell that matches the target's weakness, while MP can pay
   * for it. Otherwise Fight. A target with no weakness is a Fight.
   */
  chooseCaster(hero: { mp: number }, target: { weak?: Element }): "fight" | SpellChoice {
    const spell = this.spells.find((entry) => entry.element === target.weak);
    if (!spell || hero.mp < spell.cost) return "fight";
    return this.toSpellChoice(spell);
  }

  /**
   * A crash-finding combat choice.
   *
   * One roll picks among Fight, Defend, Flee, a potion when one is left, and
   * each known spell the hero can pay for.
   */
  chooseRandom(hero: {
    mp: number;
    potions: number;
  }): "fight" | "defend" | "potion" | "flee" | SpellChoice {
    const legal: ("fight" | "defend" | "potion" | "flee" | SpellChoice)[] = ["fight", "defend"];
    if (hero.potions > 0) legal.push("potion");
    legal.push("flee");

    for (const spell of this.spells) {
      if (hero.mp < spell.cost) continue;
      legal.push(this.toSpellChoice(spell));
    }

    const index = Math.floor(this.rng.next() * legal.length);
    return legal[index] ?? "fight";
  }

  /** This turn's cast of a known spell. */
  private toSpellChoice(spell: KnownSpell): SpellChoice {
    return {
      type: "spell",
      spellId: spell.id,
      element: spell.element,
      power: spell.power,
      cost: spell.cost,
    };
  }
}
