import { physicalDamage } from "./damage";
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
  | { type: "damaged"; actorId: string; targetId: string; amount: number; targetHp: number };

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
};

/**
 * Runs a fight in which each side uses Fight on its turn.
 *
 * Turns follow the haste queue. Each hit is an `attacked` event and a
 * `damaged` event. The fight stops when either HP reaches zero. The spread
 * for each hit is `spreadMin + rng.next() * (spreadMax - spreadMin)`.
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
    const amount = physicalDamage(actor.str, target.def, spread);
    target.hp = Math.max(0, target.hp - amount);
    events.push({ type: "attacked", actorId: actor.id, targetId: target.id });
    events.push({
      type: "damaged",
      actorId: actor.id,
      targetId: target.id,
      amount,
      targetHp: target.hp,
    });
  }

  return events;
}
