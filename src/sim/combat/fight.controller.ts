import type { FightEvent, Fighter, FightInput, PreparedFighter, TurnAction } from "./fight.types";
import type { SpellChoice } from "./policy.types";
import { HasteTurnQueue } from "./turn-queue.controller";
import {
  applyCritical,
  applyDefend,
  elementMultiplier,
  magicDamage,
  physicalDamage,
} from "./utils/damage";
import { fleeChance } from "./utils/flee";
import { gainXp } from "./utils/level";
import type { HeroProgress } from "./utils/level.types";
import { pickWeighted } from "./weighted";

/**
 * Plays one hero against one mob.
 *
 * Each turn is Fight, Defend, a potion, or Run; omitted actions Fight.
 * Turns follow the haste queue. Fight emits `attacked` and `damaged`. Defend
 * emits `defended` and halves damage taken until that actor's next turn. A
 * potion emits `itemUsed`, restores HP up to the drinker's maximum, and spends
 * the turn. Run emits `fleeAttempted`. Success ends the fight. Failure spends
 * the turn. A miniboss attempt fails without a roll. An enemy with an action
 * list picks one by weight when that turn is not scripted. A spell it cannot
 * afford is Fight instead. Grind multiplies a physical hit. Defend halves
 * whatever damage gets through, including spells. The fight stops when either
 * HP reaches zero, and that actor is defeated. A fallen enemy grants its XP.
 * Each hit rolls the spread, then the crit chance. A crit multiplies that
 * damage and rounds down again, and Defend applies after that.
 */
export class OneOnOneFightController {
  /** The player's fighter. A copy, so the caller's hero is left alone. */
  private readonly hero: PreparedFighter;
  /** The mob. A copy, so the caller's enemy is left alone. */
  private readonly enemy: PreparedFighter;
  /** Who acts next. */
  private readonly queue: HasteTurnQueue;
  /** What happened, in order. */
  private readonly events: FightEvent[] = [];
  /** Who is guarding. A guard ends when that actor's next turn starts. */
  private readonly defending = new Set<string>();
  /** How many turns each actor has already taken. */
  private readonly taken = new Map<string, number>();

  /**
   * @param input The two fighters, the rolls, and the bundle's numbers.
   */
  constructor(private readonly input: FightInput) {
    this.hero = this.prepare(input.hero);
    this.enemy = this.prepare(input.enemy);
    this.queue = new HasteTurnQueue(
      [
        { id: this.hero.id, haste: this.hero.haste, hero: this.hero.hero },
        { id: this.enemy.id, haste: this.enemy.haste, hero: this.enemy.hero },
      ],
      input.turnBase,
    );
    this.taken.set(this.hero.id, 0);
    this.taken.set(this.enemy.id, 0);
  }

  /** Plays until someone falls or the hero escapes. */
  resolve(): FightEvent[] {
    const { hero, enemy, queue, events, defending, taken, input } = this;

    while (hero.hp > 0 && enemy.hp > 0) {
      // The haste queue names the actor, and their guard ends as the turn starts.
      const actorId = queue.act();
      const actor = actorId === hero.id ? hero : enemy;
      const target = actor === hero ? enemy : hero;
      defending.delete(actor.id);

      // Defend halves whatever just landed, including a spell or a grind.
      const guarded = (amount: number) =>
        defending.has(target.id) ? applyDefend(amount, input.defendMultiplier) : amount;

      // Pay for a spell and resolve it. The caller has already checked the MP.
      const castSpell = (spell: SpellChoice) => {
        actor.mp -= spell.cost;
        const spread = input.spreadMin + input.rng.next() * (input.spreadMax - input.spreadMin);
        const multiplier = elementMultiplier(
          spell.element,
          target.weak,
          target.resists,
          input.weaknessMultiplier,
          input.resistanceMultiplier,
        );
        const amount = guarded(magicDamage(spell.power, actor.mag, multiplier, spread));
        target.hp = Math.max(0, target.hp - amount);

        events.push({
          type: "spellCast",
          actorId: actor.id,
          spellId: spell.spellId,
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
        this.defeatIfDown(target);
      };

      // Spread, then a crit, then the grind multiplier.
      const resolveGrind = (multiplier: number) => {
        const spread = input.spreadMin + input.rng.next() * (input.spreadMax - input.spreadMin);
        const critical = input.rng.next() < input.critChance;
        const hit = physicalDamage(actor.str, target.def, spread);
        const rolled = critical ? applyCritical(hit, input.critMultiplier) : hit;
        const scaled = Math.max(1, Math.floor(rolled * multiplier));
        const amount = guarded(scaled);
        target.hp = Math.max(0, target.hp - amount);

        events.push({
          type: "grind",
          actorId: actor.id,
          targetId: target.id,
          multiplier,
        });
        events.push({
          type: "damaged",
          actorId: actor.id,
          targetId: target.id,
          amount,
          targetHp: target.hp,
          critical,
        });
        this.defeatIfDown(target);
      };

      // A scripted action wins. Otherwise an enemy with a list rolls it, and anything left is Fight.
      const turn = taken.get(actor.id) ?? 0;
      taken.set(actor.id, turn + 1);
      const script = actor === hero ? input.heroActions : input.enemyActions;
      const scripted = script?.[turn];
      let action: TurnAction = "fight";

      // A recorded spell or grind plays out. An unpaid spell falls through to Fight.
      if (typeof scripted === "object") {
        if (scripted.type === "spell" && actor.mp >= scripted.cost) {
          castSpell(scripted);
          continue;
        }
        if (scripted.type === "grind") {
          resolveGrind(scripted.multiplier);
          continue;
        }
      } else if (typeof scripted === "string") {
        action = scripted;
      } else if (actor === hero && input.heroPolicy) {
        const choice = input.heroPolicy(actor, target);
        if (typeof choice === "string") {
          action = choice;
        } else if (actor.mp >= choice.cost) {
          castSpell(choice);
          continue;
        }
      } else if (actor === enemy && enemy.actions && enemy.actions.length > 0) {
        const picked = pickWeighted(enemy.actions, (input.choiceRng ?? input.rng).next());

        // Pay for the spell and resolve it now. An unpaid spell falls through to Fight.
        if (picked.type === "spell" && actor.mp >= picked.cost) {
          castSpell(picked);
          continue;
        }

        if (picked.type === "grind") {
          resolveGrind(picked.multiplier);
          continue;
        }

        action = picked.type === "spell" ? "fight" : picked.type;
      }

      // Guard until this actor's next turn.
      if (action === "defend") {
        defending.add(actor.id);
        events.push({ type: "defended", actorId: actor.id });
        continue;
      }

      // Drink one potion. An empty stack still spends the turn.
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

      // A miniboss attempt fails without a roll. Success ends the fight.
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

      // Physical hit: spread, then a crit, then halve it when the target is guarding.
      const spread = input.spreadMin + input.rng.next() * (input.spreadMax - input.spreadMin);
      const critical = input.rng.next() < input.critChance;
      const hit = physicalDamage(actor.str, target.def, spread);
      const rolled = critical ? applyCritical(hit, input.critMultiplier) : hit;
      const amount = guarded(rolled);
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
      this.defeatIfDown(target);
    }

    return events;
  }

  /** A copy with the defaults filled in. The caller's fighter is left alone. */
  private prepare(fighter: Fighter): PreparedFighter {
    const mp = fighter.mp ?? 0;
    return {
      ...fighter,
      maxHp: fighter.maxHp ?? fighter.hp,
      maxMp: fighter.maxMp ?? mp,
      potions: fighter.potions ?? 0,
      mag: fighter.mag ?? 0,
      mp,
      level: fighter.level ?? 1,
      xp: fighter.xp ?? 0,
      xpReward: fighter.xpReward ?? 0,
    };
  }

  /** Zero HP defeats that actor. Only a fallen enemy grants XP. */
  private defeatIfDown(target: PreparedFighter): void {
    if (target.hp > 0) return;

    const { hero, enemy, events } = this;
    const leveling = this.input.leveling;
    events.push({ type: "actorDefeated", actorId: target.id });
    if (target !== enemy || enemy.xpReward <= 0 || !leveling) return;

    const gained = gainXp(this.progressOf(hero), enemy.xpReward, leveling);
    Object.assign(hero, gained.hero);
    events.push(...gained.events);
  }

  /** The hero's level, XP, and stats, ready for a win to raise them. */
  private progressOf(hero: PreparedFighter): HeroProgress {
    return {
      level: hero.level,
      xp: hero.xp,
      hp: hero.hp,
      maxHp: hero.maxHp,
      mp: hero.mp,
      maxMp: hero.maxMp,
      str: hero.str,
      def: hero.def,
      mag: hero.mag,
      haste: hero.haste,
    };
  }
}
