import { pickWeightedListEntry } from "../utils/weighted";
import type {
  EnemyAction,
  FightEvent,
  Fighter,
  FightInput,
  PreparedFighter,
  ScriptedAction,
  TurnAction,
} from "./fight.types";
import type { SpellChoice } from "./policy.types";
import { HasteTurnQueue } from "./turn-queue.controller";
import {
  applyCriticalHitDamage,
  applyDefendingDamageReduction,
  calculateElementDamageMultiplier,
  calculateMagicDamage,
  calculatePhysicalDamage,
} from "./utils/damage";
import { calculateFleeChance } from "./utils/flee";
import { grantExperienceAndRaiseLevels } from "./utils/level";
import type { HeroProgress } from "./utils/level.types";

/**
 * Plays one hero against one mob, pausing at each hero turn.
 *
 * `start` plays up to the hero's first decision, and each `act` plays the
 * hero's choice and every enemy turn until the next one. `resolve` plays the
 * whole fight from the script and the policy.
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
  /** How many turns each actor has started. */
  private readonly taken = new Map<string, number>();
  /** True while the hero's turn has started and waits for a choice. */
  private heroTurnOpen = false;
  /** True once someone has fallen or the hero has escaped. */
  private over = false;

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

  /**
   * Plays the enemy's turns until the hero must choose, or the fight is over.
   * Call once, before the first `act`.
   *
   * @returns What happened before the hero's first turn.
   */
  start(): FightEvent[] {
    const from = this.events.length;
    this.advance();
    return this.events.slice(from);
  }

  /** True while the fight waits for the hero's choice. */
  awaitingHero(): boolean {
    return this.heroTurnOpen;
  }

  /** True once someone has fallen or the hero has escaped. */
  ended(): boolean {
    return this.over;
  }

  /**
   * Plays the hero's turn, then the enemy's turns until the hero must choose again.
   *
   * @param choice Fight, Defend, a potion, Run, a cast, or a grind. An unpaid cast is Fight.
   * @returns Every event from the hero's action up to their next decision or the fight's end.
   */
  act(choice: ScriptedAction): FightEvent[] {
    if (!this.heroTurnOpen) throw new Error("The fight is not waiting for the hero");
    const from = this.events.length;
    this.heroTurnOpen = false;
    this.takeTurn(this.hero, this.enemy, choice);
    this.advance();
    return this.events.slice(from);
  }

  /**
   * Plays until someone falls or the hero escapes.
   * Each hero turn takes the script's entry, then the policy's choice, then Fight.
   */
  resolve(): FightEvent[] {
    const { hero, enemy, input } = this;
    this.start();
    while (this.heroTurnOpen) {
      const turn = (this.taken.get(hero.id) ?? 1) - 1;
      const scripted = input.heroActions?.[turn];
      this.act(scripted ?? input.heroPolicy?.(hero, enemy) ?? "fight");
    }
    return this.events;
  }

  /** Starts turns from the haste queue, playing the enemy's, until the hero's comes up or the fight ends. */
  private advance(): void {
    const { hero, enemy, queue, defending, taken, input } = this;

    while (!this.over) {
      if (hero.hp <= 0 || enemy.hp <= 0) {
        this.over = true;
        return;
      }

      // The haste queue names the actor, and their guard ends as the turn starts.
      const actorId = queue.act();
      const actor = actorId === hero.id ? hero : enemy;
      defending.delete(actor.id);
      const turn = taken.get(actor.id) ?? 0;
      taken.set(actor.id, turn + 1);

      if (actor === hero) {
        this.heroTurnOpen = true;
        return;
      }

      // A scripted action wins. Otherwise an enemy with a list rolls it, and anything left is Fight.
      const scripted = input.enemyActions?.[turn];
      if (scripted !== undefined) {
        this.takeTurn(enemy, hero, scripted);
      } else if (enemy.actions && enemy.actions.length > 0) {
        const picked = pickWeightedListEntry(enemy.actions, (input.choiceRng ?? input.rng).next());
        this.takeTurn(enemy, hero, this.enemyChoice(picked));
      } else {
        this.takeTurn(enemy, hero, "fight");
      }
    }
  }

  /** A picked list entry as a turn. Fight and Defend drop their weight. */
  private enemyChoice(picked: EnemyAction): ScriptedAction {
    switch (picked.type) {
      case "fight":
      case "defend":
        return picked.type;
      case "grind":
        return { type: "grind", multiplier: picked.multiplier };
      case "spell":
        return {
          type: "spell",
          spellId: picked.spellId,
          element: picked.element,
          power: picked.power,
          cost: picked.cost,
        };
    }
  }

  /** One actor's turn against the other. Ends the fight when the hero escapes. */
  private takeTurn(actor: PreparedFighter, target: PreparedFighter, choice: ScriptedAction): void {
    const { hero, enemy, events, defending, input } = this;

    // A paid spell or a grind plays out. An unpaid spell falls through to Fight.
    let action: TurnAction = "fight";
    if (typeof choice === "object") {
      if (choice.type === "spell" && actor.mp >= choice.cost) {
        this.castSpell(actor, target, choice);
        return;
      }
      if (choice.type === "grind") {
        this.resolveGrind(actor, target, choice.multiplier);
        return;
      }
    } else {
      action = choice;
    }

    // Guard until this actor's next turn.
    if (action === "defend") {
      defending.add(actor.id);
      events.push({ type: "defended", actorId: actor.id });
      return;
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
      return;
    }

    // A miniboss attempt fails without a roll. Success ends the fight.
    if (action === "flee" && actor === hero) {
      const chance = enemy.miniboss
        ? 0
        : calculateFleeChance(
            hero.haste,
            enemy.haste,
            input.fleeBase,
            input.fleePerPoint,
            input.fleeMin,
            input.fleeMax,
          );
      const success = chance > 0 && input.rng.next() < chance;
      events.push({ type: "fleeAttempted", actorId: hero.id, success, chance });
      if (success) this.over = true;
      return;
    }

    // Physical hit: spread, then a crit, then halve it when the target is guarding.
    const spread = input.spreadMin + input.rng.next() * (input.spreadMax - input.spreadMin);
    const critical = input.rng.next() < input.critChance;
    const hit = calculatePhysicalDamage(actor.str, target.def, spread);
    const rolled = critical ? applyCriticalHitDamage(hit, input.critMultiplier) : hit;
    const amount = this.guarded(target, rolled);
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

  /** Pays for a spell and resolves it. The caller has already checked the MP. */
  private castSpell(actor: PreparedFighter, target: PreparedFighter, spell: SpellChoice): void {
    const { events, input } = this;
    actor.mp -= spell.cost;
    const spread = input.spreadMin + input.rng.next() * (input.spreadMax - input.spreadMin);
    const multiplier = calculateElementDamageMultiplier(
      spell.element,
      target.weak,
      target.resists,
      input.weaknessMultiplier,
      input.resistanceMultiplier,
    );
    const amount = this.guarded(
      target,
      calculateMagicDamage(spell.power, actor.mag, multiplier, spread),
    );
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
  }

  /** A physical hit multiplied: spread, then a crit, then the grind multiplier. */
  private resolveGrind(actor: PreparedFighter, target: PreparedFighter, multiplier: number): void {
    const { events, input } = this;
    const spread = input.spreadMin + input.rng.next() * (input.spreadMax - input.spreadMin);
    const critical = input.rng.next() < input.critChance;
    const hit = calculatePhysicalDamage(actor.str, target.def, spread);
    const rolled = critical ? applyCriticalHitDamage(hit, input.critMultiplier) : hit;
    const scaled = Math.max(1, Math.floor(rolled * multiplier));
    const amount = this.guarded(target, scaled);
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
  }

  /** Defend halves whatever lands on a guarding target, including a spell or a grind. */
  private guarded(target: PreparedFighter, amount: number): number {
    return this.defending.has(target.id)
      ? applyDefendingDamageReduction(amount, this.input.defendMultiplier)
      : amount;
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

    const gained = grantExperienceAndRaiseLevels(this.progressOf(hero), enemy.xpReward, leveling);
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
