import {
  applyCritical,
  applyDefend,
  type Element,
  elementMultiplier,
  magicDamage,
  physicalDamage,
} from "./damage";
import { fleeChance } from "./flee";
import type { Rng } from "./rng";
import { createTurnQueue } from "./turn-queue";
import { pickWeighted, type Weighted } from "./weighted";

export type Fighter = {
  id: string;
  hp: number;
  /** Healing stops here. Defaults to the starting HP. */
  maxHp?: number;
  /** Potions carried. Defaults to zero. */
  potions?: number;
  /** Spell damage. Defaults to zero. */
  mag?: number;
  /** Magic points. Defaults to zero. */
  mp?: number;
  str: number;
  def: number;
  haste: number;
  weak?: Element;
  resists?: Element;
  /** Used when this actor has no scripted action for the turn. */
  actions?: EnemyAction[];
  hero?: boolean;
  /** A miniboss fight cannot be fled. */
  miniboss?: boolean;
};

export type TurnAction = "fight" | "defend" | "potion" | "flee";

export type EnemyAction =
  | ({ type: "fight" | "defend" } & Weighted)
  | ({
      type: "spell";
      spellId: "spell.ember" | "spell.frost";
      element: Element;
      power: number;
      cost: number;
    } & Weighted);

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
  | { type: "fleeAttempted"; actorId: string; success: boolean; chance: number }
  | {
      type: "spellCast";
      actorId: string;
      spellId: "spell.ember" | "spell.frost";
      targetId: string;
      mp: number;
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
  /** Flee chance before the haste bonus. Prototype one uses 0.5. */
  fleeBase: number;
  /** Added per point of hero haste over the enemy's haste. Prototype one uses 0.05. */
  fleePerPoint: number;
  /** Lowest flee chance. Prototype one uses 0.1. */
  fleeMin: number;
  /** Highest flee chance. Prototype one uses 0.9. */
  fleeMax: number;
  /** Magic damage multiplier against a weakness. Prototype one uses 1.5. */
  weaknessMultiplier: number;
  /** Magic damage multiplier against a resistance. Prototype one uses 0.5. */
  resistanceMultiplier: number;
  /** One entry per hero turn. Turns past the end Fight. */
  heroActions?: TurnAction[];
  /** One entry per enemy turn. Turns past the end Fight. */
  enemyActions?: TurnAction[];
};

/**
 * Runs a fight. Each turn is Fight, Defend, a potion, or Run; omitted actions Fight.
 *
 * Turns follow the haste queue. Fight emits `attacked` and `damaged`. Defend
 * emits `defended` and halves damage taken until that actor's next turn. A
 * potion emits `itemUsed`, restores HP up to the drinker's maximum, and spends
 * the turn. Run emits `fleeAttempted`. Success ends the fight. Failure spends
 * the turn. A miniboss attempt fails without a roll. An enemy with an action
 * list picks one by weight when that turn is not scripted. A spell it cannot
 * afford is Fight instead. The fight also stops when
 * either HP reaches zero. Each hit rolls the spread, then the crit chance. A
 * crit multiplies that damage and rounds down again, and Defend applies after
 * that.
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
    const scripted = script?.[turn];
    let action: TurnAction = scripted ?? "fight";
    if (scripted === undefined && actor === enemy && enemy.actions && enemy.actions.length > 0) {
      const picked = pickWeighted(enemy.actions, input.rng.next());
      if (picked.type === "spell" && actor.mp >= picked.cost) {
        actor.mp -= picked.cost;
        const spread = input.spreadMin + input.rng.next() * (input.spreadMax - input.spreadMin);
        const multiplier = elementMultiplier(
          picked.element,
          target.weak,
          target.resists,
          input.weaknessMultiplier,
          input.resistanceMultiplier,
        );
        const amount = magicDamage(picked.power, actor.mag, multiplier, spread);
        target.hp = Math.max(0, target.hp - amount);
        events.push({
          type: "spellCast",
          actorId: actor.id,
          spellId: picked.spellId,
          targetId: target.id,
          mp: actor.mp,
        });
        events.push({
          type: "damaged",
          actorId: actor.id,
          targetId: target.id,
          amount,
          targetHp: target.hp,
          critical: false,
        });
        continue;
      }
      action = picked.type === "spell" ? "fight" : picked.type;
    }
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
    if (action === "flee" && actor === hero) {
      const chance = enemy.miniboss
        ? 0
        : fleeChance(
            hero.haste,
            enemy.haste,
            input.fleeBase,
            input.fleePerPoint,
            input.fleeMin,
            input.fleeMax,
          );
      const success = chance > 0 && input.rng.next() < chance;
      events.push({ type: "fleeAttempted", actorId: hero.id, success, chance });
      if (success) return events;
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

function prepare(
  fighter: Fighter,
): Fighter & { maxHp: number; potions: number; mag: number; mp: number } {
  return {
    ...fighter,
    maxHp: fighter.maxHp ?? fighter.hp,
    potions: fighter.potions ?? 0,
    mag: fighter.mag ?? 0,
    mp: fighter.mp ?? 0,
  };
}
