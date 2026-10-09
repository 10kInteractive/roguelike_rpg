import { Box3, type Material, Mesh, MeshLambertMaterial, Vector3 } from "three";
import { debugLog } from "../../debug/logger.controller";
import type { FightEvent } from "../../sim/combat/fight.types";
import { floatingTextColors } from "./floating-text.constants";
import type { FloatingTextController } from "./floating-text.controller";
import type { CombatSceneController } from "./scene.controller";
import type { StagedActor } from "./scene.types";
import { beatDistance, beatSeconds, flashColors } from "./sequencer.constants";
import type { TweenController } from "./tween.controller";

const log = debugLog.create("view:sequencer");

/**
 * Plays a fight's events on the combat stage, one after another.
 *
 * Each event is one awaited beat: a lunge, a flash, a rising number, a fade.
 * Before each hero action it waits on `beforeHeroTurn`, the point where the
 * UI will ask the player for a command. The sim has already decided every
 * outcome. The sequencer only shows them.
 */
export class CombatSequencerController {
  /** The stage whose actors move. */
  private readonly combat: CombatSceneController;

  /** Drives every beat. */
  private readonly tweens: TweenController;

  /** Damage, heal, and level numbers. */
  private readonly text: FloatingTextController;

  /** Id the hero's events carry, such as `hero.strider`. */
  private readonly heroId: string;

  /** Resolves when the hero may act. The UI's command menu will sit here. */
  private readonly beforeHeroTurn: () => Promise<void>;

  /** The event being played, for the dev panel. */
  private current = "idle";

  constructor(input: {
    /** The stage whose actors move. */
    combat: CombatSceneController;
    /** Drives every beat. */
    tweens: TweenController;
    /** Damage, heal, and level numbers. */
    text: FloatingTextController;
    /** Id the hero's events carry. */
    heroId: string;
    /** Resolves when the hero may act. */
    beforeHeroTurn: () => Promise<void>;
  }) {
    this.combat = input.combat;
    this.tweens = input.tweens;
    this.text = input.text;
    this.heroId = input.heroId;
    this.beforeHeroTurn = input.beforeHeroTurn;
  }

  /** The event being played, or `idle`. */
  playing(): string {
    return this.current;
  }

  /**
   * Plays every event of one mob's fight, in order. Resolves after the last beat.
   *
   * @param events One fight's events, as the sim returned them.
   */
  async play(events: readonly FightEvent[]): Promise<void> {
    for (const event of events) {
      if (this.isHeroAction(event)) {
        this.current = "awaiting input";
        await this.beforeHeroTurn();
      }
      this.current = event.type;
      log(event.type, "actorId" in event ? event.actorId : "");
      await this.beat(event);
    }
    this.current = "idle";
  }

  /** One event's animation. */
  private async beat(event: FightEvent): Promise<void> {
    switch (event.type) {
      case "attacked":
        await this.lunge(this.actor(event.actorId), beatDistance.lunge);
        return;
      case "grind": {
        const actor = this.actor(event.actorId);
        await this.flash(actor, flashColors.windUp, beatSeconds.windUp);
        await this.lunge(actor, beatDistance.grindLunge);
        return;
      }
      case "spellCast": {
        void this.hop(this.actor(event.actorId), beatSeconds.cast);
        await this.flash(this.actor(event.targetId), flashColors[event.spellId], beatSeconds.cast);
        return;
      }
      case "damaged": {
        const target = this.actor(event.targetId);
        const color = event.critical ? floatingTextColors.critical : floatingTextColors.damage;
        void this.text.show(
          `${event.amount}${event.critical ? "!" : ""}`,
          this.above(target),
          color,
        );
        void this.flash(target, flashColors.hit, beatSeconds.flash);
        await this.tweens.wait(beatSeconds.afterHit);
        return;
      }
      case "defended": {
        const actor = this.actor(event.actorId);
        void this.flash(actor, flashColors.guard, beatSeconds.hop);
        await this.hop(actor, beatSeconds.hop);
        return;
      }
      case "itemUsed": {
        const actor = this.actor(event.actorId);
        void this.text.show(`+${event.amount}`, this.above(actor), floatingTextColors.heal);
        void this.flash(actor, flashColors.heal, beatSeconds.hop);
        await this.hop(actor, beatSeconds.hop);
        return;
      }
      case "fleeAttempted": {
        const actor = this.actor(event.actorId);
        if (event.success) {
          await this.runOff(actor);
          return;
        }
        // A miniboss fight has no chance at all, which reads differently from a bad roll.
        const words = event.chance === 0 ? "No escape" : "Failed";
        await this.text.show(words, this.above(actor), floatingTextColors.damage);
        return;
      }
      case "actorDefeated":
        await this.defeat(this.actor(event.actorId));
        return;
      case "xpGained": {
        const hero = this.combat.heroActor();
        await this.text.show(`+${event.amount} XP`, this.above(hero), floatingTextColors.xp);
        return;
      }
      case "levelUp": {
        const hero = this.combat.heroActor();
        void this.flash(hero, flashColors.level, beatSeconds.defeat);
        await this.text.show(`LV ${event.level}`, this.above(hero), floatingTextColors.level);
        return;
      }
    }
  }

  /** True for an event that is the hero choosing to do something. */
  private isHeroAction(event: FightEvent): boolean {
    if (!("actorId" in event) || event.actorId !== this.heroId) return false;
    return (
      event.type === "attacked" ||
      event.type === "grind" ||
      event.type === "spellCast" ||
      event.type === "defended" ||
      event.type === "itemUsed" ||
      event.type === "fleeAttempted"
    );
  }

  /** The hero, or the mob being fought. A pack fights one mob at a time. */
  private actor(actorId: string): StagedActor {
    if (actorId === this.heroId) return this.combat.heroActor();
    const foe = this.combat.focusedActor();
    if (!foe) throw new Error(`No mob on stage for ${actorId}`);
    return foe;
  }

  /** Out toward the other side and back. The hero lunges west, a mob east. */
  private lunge(actor: StagedActor, reach: number): Promise<void> {
    const startX = actor.model.position.x;
    const toward = actor === this.combat.heroActor() ? -1 : 1;
    return this.tweens.run(beatSeconds.lunge, (progress) => {
      actor.model.position.x = startX + toward * reach * Math.sin(progress * Math.PI);
    });
  }

  /** A small jump on the spot. */
  private hop(actor: StagedActor, seconds: number): Promise<void> {
    return this.tweens.run(seconds, (progress) => {
      actor.lift = beatDistance.hop * Math.sin(progress * Math.PI);
    });
  }

  /** A tint that fades back to normal. */
  private flash(actor: StagedActor, color: number, seconds: number): Promise<void> {
    const materials = this.materials(actor);
    return this.tweens.run(seconds, (progress) => {
      for (const material of materials) {
        material.emissive.setHex(color).multiplyScalar(1 - progress);
      }
    });
  }

  /** Fades and sinks out, then hides. */
  private async defeat(actor: StagedActor): Promise<void> {
    actor.down = true;
    const materials = this.materials(actor);
    for (const material of materials) material.transparent = true;
    await this.tweens.run(beatSeconds.defeat, (progress) => {
      for (const material of materials) material.opacity = 1 - progress;
      actor.lift = -beatDistance.sink * progress;
    });
    actor.model.visible = false;
  }

  /** The hero runs east off the stage. */
  private runOff(actor: StagedActor): Promise<void> {
    const startX = actor.model.position.x;
    return this.tweens.run(beatSeconds.flee, (progress) => {
      actor.model.position.x = startX + beatDistance.flee * progress;
    });
  }

  /** Just above an actor's head, where its numbers start. */
  private above(actor: StagedActor): Vector3 {
    const top = new Box3().setFromObject(actor.model).max.y;
    const { x, z } = actor.model.position;
    return new Vector3(x, top + 0.2, z);
  }

  /** Every Lambert material on an actor's model, for tints and fades. */
  private materials(actor: StagedActor): MeshLambertMaterial[] {
    const found: MeshLambertMaterial[] = [];
    actor.model.traverse((part) => {
      if (!(part instanceof Mesh)) return;
      const list: Material[] = Array.isArray(part.material) ? part.material : [part.material];
      for (const material of list) {
        if (material instanceof MeshLambertMaterial) found.push(material);
      }
    });
    return found;
  }
}
