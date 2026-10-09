import type { QueuedActor, TurnActor } from "./turn-queue.types";

/**
 * Orders combat turns by next-turn time.
 *
 * Everyone starts at time 0. The lowest time acts. A tie goes to the higher
 * haste, then the hero, then the earlier entry in the constructor list. After
 * an action, that actor's time increases by `turnBase / haste`, so twice the
 * haste means half the wait and twice the turns.
 */
export class HasteTurnQueue {
  /** Actors still waiting, in the order they were given. */
  private readonly waiting: QueuedActor[];

  /** Time added per action before dividing by haste. */
  private readonly turnBase: number;

  /**
   * @param actors Fighters in list order. Each haste must be above zero.
   * @param turnBase Time added per action before dividing by haste.
   */
  constructor(actors: readonly TurnActor[], turnBase: number) {
    if (actors.length === 0) {
      throw new Error("A turn queue needs at least one actor");
    }
    if (turnBase <= 0) {
      throw new Error("Turn base must be above zero");
    }

    this.turnBase = turnBase;
    this.waiting = actors.map((actor, order) => {
      if (actor.haste <= 0) {
        throw new Error(`Haste must be above zero for ${actor.id}`);
      }
      return { id: actor.id, haste: actor.haste, hero: actor.hero === true, time: 0, order };
    });
  }

  /** The actor who acts next. Advances that actor's time. */
  act(): string {
    return this.step(this.waiting);
  }

  /** The next `count` actors to act, soonest first. Does not advance the queue. */
  upcoming(count: number): string[] {
    const copy = this.waiting.map((actor) => ({ ...actor }));
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(this.step(copy));
    }
    return ids;
  }

  /** The actor who goes now. Their next turn is pushed back by the turn base. */
  private step(queued: QueuedActor[]): string {
    const actor = this.soonest(queued);
    actor.time += this.turnBase / actor.haste;
    return actor.id;
  }

  /** The actor whose turn is due first. */
  private soonest(queued: readonly QueuedActor[]): QueuedActor {
    let best = queued[0];
    if (!best) {
      throw new Error("A turn queue needs at least one actor");
    }
    for (const actor of queued) {
      if (this.comesBefore(actor, best)) {
        best = actor;
      }
    }
    return best;
  }

  /** True when `a` should act before `b`: sooner time, then higher haste, then the hero. */
  private comesBefore(a: QueuedActor, b: QueuedActor): boolean {
    if (a.time !== b.time) {
      return a.time < b.time;
    }
    if (a.haste !== b.haste) {
      return a.haste > b.haste;
    }
    if (a.hero !== b.hero) {
      return a.hero;
    }
    return a.order < b.order;
  }
}
