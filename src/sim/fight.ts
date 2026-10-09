import { applyCritical, physicalDamage } from "./damage";
import type { Rng } from "./rng";
import { createTurnQueue } from "./turn-queue";

export type Fighter = {
  id: string;
  hp: number;
  str: number;
  def: number;
  haste: number;
  hero?: boolean;
};

export type FightEvent =
  | { type: "attacked"; actorId: string; targetId: string }
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
};

/**
 * Runs a fight in which each side uses Fight on its turn.
 *
 * Turns follow the haste queue. Each hit is an `attacked` event and a
 * `damaged` event. The fight stops when either HP reaches zero. Each hit rolls
 * the spread, then the crit chance. A crit multiplies that damage and rounds
 * down again.
 */
export function fight(input: FightInput): FightEvent[] {
  const hero = { ...input.hero };
  const enemy = { ...input.enemy };
  const queue = createTurnQueue(
    [
      { id: hero.id, haste: hero.haste, hero: hero.hero },
      { id: enemy.id, haste: enemy.haste, hero: enemy.hero },
    ],
    input.turnBase,
  );
  const events: FightEvent[] = [];

  while (hero.hp > 0 && enemy.hp > 0) {
    const actorId = queue.act();
    const actor = actorId === hero.id ? hero : enemy;
    const target = actor === hero ? enemy : hero;
    const spread = input.spreadMin + input.rng.next() * (input.spreadMax - input.spreadMin);
    const critical = input.rng.next() < input.critChance;
    const hit = physicalDamage(actor.str, target.def, spread);
    const amount = critical ? applyCritical(hit, input.critMultiplier) : hit;
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
