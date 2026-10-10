import { OneOnOneFightController } from "../combat/fight.controller";
import type { FightEvent, Fighter } from "../combat/fight.types";
import type { EncounterSpawn } from "../field/encounters.types";
import type { PackFight, PackFightInput, PackOutcome, PackResult } from "./pack.types";
import type { HeroState } from "./run.types";

/**
 * Fights packs one mob at a time, carrying the hero from fight to fight.
 *
 * The hero's HP, MP, potions, XP, and level carry to the next mob and the
 * next pack. A flee or a defeat ends the pack. After a win, a mob with a drop
 * chance drops a potion when the roll is below it. Beating the miniboss ends the pack.
 */
export class PackFightController {
  /** The mobs, numbers, policy, and rolls every fight uses. */
  private readonly input: PackFightInput;

  /** The hero as the last fight left them. */
  private readonly state: HeroState;

  /** @param input The hero, the mobs, the numbers, and the rolls. */
  constructor(input: PackFightInput) {
    this.input = input;
    this.state = this.copyHero(input.hero);
  }

  /** The hero as the last fight left them. A copy, so callers cannot change it. */
  hero(): HeroState {
    return { ...this.state };
  }

  /**
   * Fights every mob in the pack, in order.
   *
   * @param groups The pack, as the encounter rolled it.
   * @param miniboss True for the miniboss fight. Beating that mob ends the pack. The mobs in front of it do not.
   */
  fight(groups: readonly EncounterSpawn[], miniboss = false): PackResult {
    const fights: PackFight[] = [];
    for (const group of groups) {
      for (let count = 0; count < group.count; count++) {
        const fought = this.fightOne(group.id, miniboss);
        fights.push(fought);
        if (fought.outcome !== "win") return { outcome: fought.outcome, fights };
        const boss = this.input.mobs.get(group.id)?.fighter.miniboss === true;
        if (miniboss && boss) return { outcome: "win", fights };
      }
    }
    return { outcome: "win", fights };
  }

  /** One mob's fight, then the hero's new state and any potion drop. */
  private fightOne(mobId: string, lockFlee: boolean): PackFight {
    const mob = this.input.mobs.get(mobId);
    if (!mob) throw new Error(`Unknown mob "${mobId}"`);

    const events = new OneOnOneFightController({
      hero: { ...this.state, hero: true },
      enemy: lockFlee ? { ...mob.fighter, miniboss: true } : mob.fighter,
      rng: this.input.rngs.combat,
      choiceRng: this.input.rngs.choice,
      ...this.input.combat,
      leveling: this.input.leveling,
      heroPolicy: this.input.heroPolicy,
    }).resolve();
    const outcome = this.outcomeOf(events);
    this.applyFight(events);

    // A drop is rolled only after a win, and only for a mob with a chance.
    let potionDropped = false;
    if (outcome === "win" && mob.potionDrop !== undefined) {
      potionDropped = this.input.rngs.drops.next() < mob.potionDrop;
      if (potionDropped) this.state.potions += 1;
    }
    return { mobId, events, outcome, potionDropped };
  }

  /** Win when an enemy falls, flee when the hero escapes, lose when the hero falls. */
  private outcomeOf(events: readonly FightEvent[]): PackOutcome {
    for (const event of events) {
      if (event.type === "fleeAttempted" && event.success) return "flee";
      if (event.type === "actorDefeated") return event.actorId === this.state.id ? "lose" : "win";
    }
    return "lose";
  }

  /** Writes the fight's last HP, MP, potions, and level back onto the hero. */
  private applyFight(events: readonly FightEvent[]): void {
    const hero = this.state;
    for (const event of events) {
      if (event.type === "damaged" && event.targetId === hero.id) hero.hp = event.targetHp;
      if (event.type === "itemUsed" && event.actorId === hero.id) {
        hero.hp = event.hp;
        hero.potions = event.remaining;
      }
      if (event.type === "spellCast" && event.actorId === hero.id) hero.mp = event.mp;
      if (event.type === "xpGained") {
        hero.xp = event.xp;
        hero.level = event.level;
      }
      if (event.type === "levelUp") {
        hero.xp -= this.input.leveling.xpPerLevel;
        hero.level = event.level;
        hero.hp = event.hp;
        hero.maxHp = event.maxHp;
        hero.mp = event.mp;
        hero.maxMp = event.maxMp;
        hero.str = event.str;
        hero.def = event.def;
        hero.mag = event.mag;
        hero.haste = event.haste;
      }
    }
  }

  /** The hero at the start, with the defaults filled in. */
  private copyHero(hero: Fighter): HeroState {
    const mp = hero.mp ?? 0;
    return {
      id: hero.id,
      hp: hero.hp,
      maxHp: hero.maxHp ?? hero.hp,
      mp,
      maxMp: hero.maxMp ?? mp,
      str: hero.str,
      def: hero.def,
      mag: hero.mag ?? 0,
      haste: hero.haste,
      potions: hero.potions ?? 0,
      level: hero.level ?? 1,
      xp: hero.xp ?? 0,
    };
  }
}
