export type HeroVitals = {
  hp: number;
  maxHp: number;
  potions: number;
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
