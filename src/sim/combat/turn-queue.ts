/** Someone who takes turns in a fight. */
export type TurnActor = {
  /** Id written on this actor's events. */
  id: string;
  /** How quickly this actor's turn comes back around. Must be above zero. */
  haste: number;
  /** Wins a tie that haste does not already decide. */
  hero?: boolean;
};

export type TurnQueue = {
  /** The actor who acts next. Advances that actor's time. */
  act(): string;
  /** The next `count` actors to act, soonest first. Does not advance the queue. */
  upcoming(count: number): string[];
};

/** One actor waiting in the haste queue. */
type QueuedActor = {
  /** Id written on this actor's events. */
  id: string;
  /** How quickly this actor's turn comes back around. */
  haste: number;
  /** Wins a tie that haste does not already decide. */
  hero: boolean;
  /** When this actor may act again. Lower goes first. */
  time: number;
  /** Place in the original list. Breaks a tie the hero flag does not. */
  order: number;
};

/**
 * Orders combat turns by next-turn time.
 *
 * Everyone starts at time 0. The lowest time acts. A tie goes to the higher
 * haste, then the hero, then the earlier entry in `actors`. After an action,
 * that actor's time increases by `turnBase / haste`, so twice the haste means
 * half the wait and twice the turns.
 *
 * @param actors Fighters in list order. Each haste must be above zero.
 * @param turnBase Time added per action before dividing by haste.
 */
export function createTurnQueue(actors: readonly TurnActor[], turnBase: number): TurnQueue {
  if (actors.length === 0) {
    throw new Error("A turn queue needs at least one actor");
  }
  if (turnBase <= 0) {
    throw new Error("Turn base must be above zero");
  }

  const queued = actors.map((actor, order) => {
    if (actor.haste <= 0) {
      throw new Error(`Haste must be above zero for ${actor.id}`);
    }
    return { id: actor.id, haste: actor.haste, hero: actor.hero === true, time: 0, order };
  });

  return {
    act() {
      return step(queued, turnBase);
    },
    upcoming(count) {
      const copy = queued.map((actor) => ({ ...actor }));
      const ids: string[] = [];
      for (let i = 0; i < count; i++) {
        ids.push(step(copy, turnBase));
      }
      return ids;
    },
  };
}

/** The actor who goes now. Their next turn is pushed back by the turn base. */
function step(queued: QueuedActor[], turnBase: number): string {
  const actor = soonest(queued);
  actor.time += turnBase / actor.haste;
  return actor.id;
}

/** The actor whose turn is due first. */
function soonest(queued: readonly QueuedActor[]): QueuedActor {
  let best = queued[0];
  if (!best) {
    throw new Error("A turn queue needs at least one actor");
  }
  for (const actor of queued) {
    if (comesBefore(actor, best)) {
      best = actor;
    }
  }
  return best;
}

/** True when `a` should act before `b`: sooner time, then higher haste, then the hero. */
function comesBefore(a: QueuedActor, b: QueuedActor): boolean {
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
