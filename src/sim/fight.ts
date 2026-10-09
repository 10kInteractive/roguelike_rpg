import { applyCritical, applyDefend, physicalDamage } from "./damage";
import type { Rng } from "./rng";
import { createTurnQueue } from "./turn-queue";

export type Fighter = {
  id: string;
  hp: number;
  /** Healing stops here. Defaults to the starting HP. */
  maxHp?: number;
  /** Potions carried. Defaults to zero. */
  potions?: number;
  str: number;
  def: number;
  haste: number;
  hero?: boolean;
};

export type TurnAction = "fight" | "defend" | "potion";

export type FightEvent =
  | { type: "attacked"; actorId: string; targetId: string }
  | { type: "defended"; actorId: string }
  | {
      type: "itemUsed";
      actorId: string;
      itemId: "item.potion";
      amount: number;
      hp: number;
      remaining: number;
    }
  | {
      type: "damaged";
      actorId: string;
      targetId: string;
      amount: number;
      targetHp: number;
      critical: boolean;
    };

export type FightInput = {
  hero: Fighter;
  enemy: Fighter;
  rng: Rng;
  /** Time added per action before dividing by haste. */
  turnBase: number;
  /** Inclusive lower bound of the damage spread. */
  spreadMin: number;
  /** Exclusive upper bound of the damage spread. */
  spreadMax: number;
  /** A hit crits when the roll is below this. Prototype one uses 0.05. */
  critChance: number;
  /** Applied to a crit, then rounded down. Prototype one uses 1.5. */
  critMultiplier: number;
  /** Applied to damage taken while defending, then rounded down. Prototype one uses 0.5. */
  defendMultiplier: number;
  /** HP restored by one potion, before the maximum. Prototype one uses 25. */
  potionHeal: number;
  /** One entry per hero turn. Turns past the end Fight. */
  heroActions?: TurnAction[];
  /** One entry per enemy turn. Turns past the end Fight. */
  enemyActions?: TurnAction[];
};

/**
 * Runs a fight. Each turn is Fight, Defend, or a potion; omitted actions Fight.
 *
 * Turns follow the haste queue. Fight emits `attacked` and `damaged`. Defend
 * emits `defended` and halves damage taken until that actor's next turn. A
 * potion emits `itemUsed`, restores HP up to the drinker's maximum, and spends
 * the turn. The fight stops when either HP reaches zero. Each hit rolls the
 * spread, then the crit chance. A crit multiplies that damage and rounds down
 * again, and Defend applies after that.
 */
export function fight(input: FightInput): FightEvent[] {
  const hero = prepare(input.hero);
  const enemy = prepare(input.enemy);
  const queue = createTurnQueue(
    [
      { id: hero.id, haste: hero.haste, hero: hero.hero },
      { id: enemy.id, haste: enemy.haste, hero: enemy.hero },
    ],
    input.turnBase,
  );
  const events: FightEvent[] = [];
  const defending = new Set<string>();
  const taken = new Map<string, number>([
    [hero.id, 0],
    [enemy.id, 0],
  ]);

  while (hero.hp > 0 && enemy.hp > 0) {
    const actorId = queue.act();
    const actor = actorId === hero.id ? hero : enemy;
    const target = actor === hero ? enemy : hero;
    defending.delete(actor.id);
    const turn = taken.get(actor.id) ?? 0;
    taken.set(actor.id, turn + 1);
    const script = actor === hero ? input.heroActions : input.enemyActions;
    const action = script?.[turn] ?? "fight";
    if (action === "defend") {
      defending.add(actor.id);
      events.push({ type: "defended", actorId: actor.id });
      continue;
    }
    if (action === "potion") {
      const before = actor.hp;
      if (actor.potions > 0) {
        actor.potions -= 1;
        actor.hp = Math.min(actor.maxHp, actor.hp + input.potionHeal);
      }
      events.push({
        type: "itemUsed",
        actorId: actor.id,
        itemId: "item.potion",
        amount: actor.hp - before,
        hp: actor.hp,
        remaining: actor.potions,
      });
      continue;
    }
    const spread = input.spreadMin + input.rng.next() * (input.spreadMax - input.spreadMin);
    const critical = input.rng.next() < input.critChance;
    const hit = physicalDamage(actor.str, target.def, spread);
    const rolled = critical ? applyCritical(hit, input.critMultiplier) : hit;
    const amount = defending.has(target.id) ? applyDefend(rolled, input.defendMultiplier) : rolled;
    target.hp = Math.max(0, target.hp - amount);
    events.push({ type: "attacked", actorId: actor.id, targetId: target.id });
    events.push({
      type: "damaged",
      actorId: actor.id,
      targetId: target.id,
      amount,
      targetHp: target.hp,
      critical,
    });
  }

  return events;
}

function prepare(fighter: Fighter): Fighter & { maxHp: number; potions: number } {
  return { ...fighter, maxHp: fighter.maxHp ?? fighter.hp, potions: fighter.potions ?? 0 };
}
