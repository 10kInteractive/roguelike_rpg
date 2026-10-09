import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { Action, CombatantView, SimEvent, Snapshot } from "../sim/game.types";
import { commandRows } from "./commands";
import { messageFor } from "./messages";
import type { UiState } from "./store.types";

/** How many lines the log keeps. Older ones drop off the top. */
const logLimit = 6;

/**
 * The overlay's copy of the run: the latest snapshot, and the events still
 * waiting to play.
 *
 * The sim decides outcomes. This store only remembers what the overlay and
 * the view are working through. Hit points move when that event plays, and
 * `present` brings the rest in line once the view has caught up. One per page.
 */
export class UiStoreController {
  /** The zustand store React subscribes to. */
  private readonly store: StoreApi<UiState>;

  /** Wall clock in milliseconds. Tests pass their own. */
  private readonly now: () => number;

  /** When this run's clock started. Null before the first snapshot. */
  private startedAt: number | null = null;

  /** Milliseconds already spent paused, not counting a pause that is still open. */
  private pausedMs = 0;

  /** When the open pause began. Null while the run is going. */
  private pausedAt: number | null = null;

  /** Resolves the command the window is waiting on. */
  private resolver: ((action: Action) => void) | null = null;

  /** Resolves the restart the runtime is waiting on. */
  private restart: (() => void) | null = null;

  /** A confirm arrived before the runtime asked to restart. */
  private restartQueued = false;

  /** @param now Wall clock in milliseconds. Tests pass their own. */
  constructor(now: () => number = Date.now) {
    this.now = now;
    this.store = createStore<UiState>(() => ({
      snapshot: null,
      pending: [],
      commands: null,
      log: [],
      playMs: null,
    }));
  }

  /**
   * Drops the overlay and starts the play clock.
   * The combat launcher calls this before a pack, which has no meadow to show.
   */
  beginFight(): void {
    this.startedAt = this.now();
    this.pausedMs = 0;
    this.pausedAt = null;
    this.restartQueued = false;
    this.store.setState({ snapshot: null, pending: [], commands: null, log: [], playMs: null });
  }

  /** Leaves the open pause off the play clock. A second call while already paused does nothing. */
  holdClock(): void {
    if (this.pausedAt !== null) return;
    this.pausedAt = this.now();
  }

  /** Counts the pause that just closed, so the ending time skips it. */
  releaseClock(): void {
    if (this.pausedAt === null) return;
    this.pausedMs += this.now() - this.pausedAt;
    this.pausedAt = null;
  }

  /** Drops the clock so the next snapshot starts a new run's time. */
  resetClock(): void {
    this.startedAt = null;
    this.pausedMs = 0;
    this.pausedAt = null;
  }

  /** Replaces the snapshot with the sim's latest. A fight's log clears once it is over. */
  present(snapshot: Snapshot): void {
    const ended = this.ended(snapshot.mode);
    const previous = this.store.getState();
    const wasEnded = previous.snapshot !== null && this.ended(previous.snapshot.mode);

    // A new run starts the clock. The next field after an ending is a new run.
    if (!ended && (this.startedAt === null || wasEnded)) {
      this.startedAt = this.now();
      this.pausedMs = 0;
      this.pausedAt = null;
      this.restartQueued = false;
    }

    // Freeze play time on the first ending snapshot. Later ones keep that time.
    const playMs = ended ? (previous.playMs ?? this.playedMs()) : null;

    this.store.setState((state) => ({
      snapshot,
      log: snapshot.mode === "combat" ? state.log : [],
      commands: snapshot.mode === "combat" ? state.commands : null,
      playMs,
    }));
  }

  /** Adds events to the end of the queue, in the order they happened. */
  enqueue(events: readonly SimEvent[]): void {
    if (events.length === 0) return;
    this.store.setState((state) => ({ pending: [...state.pending, ...events] }));
  }

  /** The next event to play, if the view is behind. */
  next(): SimEvent | undefined {
    return this.store.getState().pending[0];
  }

  /**
   * The view finished the oldest waiting event.
   * A hit, a spell, a drink, or a level updates the snapshot now, and the log
   * gains that event's line, so both move with the beat.
   */
  played(): void {
    this.store.setState((state) => {
      const event = state.pending[0];
      if (!event) return state;
      const line = messageFor(event);
      return {
        pending: state.pending.slice(1),
        snapshot: state.snapshot ? this.applied(state.snapshot, event) : state.snapshot,
        log: line ? [...state.log, line].slice(-logLimit) : state.log,
      };
    });
  }

  /** The snapshot the overlay is showing, or null before a run starts. */
  snapshot(): Snapshot | null {
    return this.store.getState().snapshot;
  }

  /** Events still waiting to play, oldest first. */
  pending(): readonly SimEvent[] {
    return this.store.getState().pending;
  }

  /** The lines on the log, oldest first. */
  log(): readonly string[] {
    return this.store.getState().log;
  }

  /**
   * Opens the command window and waits for a confirm.
   *
   * @param actions What the hero may do, from the sim.
   */
  requestCommand(actions: readonly Action[]): Promise<Action> {
    this.store.setState({ commands: commandRows(actions) });
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  /** The window confirmed a command. Ignored when the window is closed. */
  submit(action: Action): void {
    const resolve = this.resolver;
    if (!resolve) return;
    this.resolver = null;
    this.store.setState({ commands: null });
    resolve(action);
  }

  /**
   * Waits until the ending screen is confirmed.
   * A confirm that arrived first still counts.
   */
  requestRestart(): Promise<void> {
    if (this.restartQueued) {
      this.restartQueued = false;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.restart = resolve;
    });
  }

  /** The ending screen confirmed a restart. Ignored while a run is going. */
  confirmRestart(): void {
    const mode = this.store.getState().snapshot?.mode;
    if (!mode || !this.ended(mode)) return;
    const resolve = this.restart;
    if (!resolve) {
      this.restartQueued = true;
      return;
    }
    this.restart = null;
    resolve();
  }

  /** How long the run lasted, once it has ended. Null before that. */
  playMs(): number | null {
    return this.store.getState().playMs;
  }

  /** The zustand store, so a React hook can subscribe. */
  api(): StoreApi<UiState> {
    return this.store;
  }

  /** Play time so far, with pauses taken out. */
  private playedMs(): number {
    const start = this.startedAt ?? this.now();
    const open = this.pausedAt === null ? 0 : this.now() - this.pausedAt;
    return Math.max(0, this.now() - start - this.pausedMs - open);
  }

  /** The snapshot with one played event's points written in. Unchanged events return it as it was. */
  private applied(snapshot: Snapshot, event: SimEvent): Snapshot {
    const hero = this.heroAfter(snapshot.hero, event);
    const enemy = snapshot.combat ? this.enemyAfter(snapshot.combat.enemy, event) : undefined;
    if (hero === snapshot.hero && enemy === snapshot.combat?.enemy) return snapshot;

    return {
      ...snapshot,
      hero,
      combat: snapshot.combat && enemy ? { ...snapshot.combat, enemy } : snapshot.combat,
    };
  }

  /** The hero after this event. The same hero when it did not touch them. */
  private heroAfter(hero: Snapshot["hero"], event: SimEvent): Snapshot["hero"] {
    switch (event.type) {
      case "damaged":
        return event.targetId === hero.id ? { ...hero, hp: event.targetHp } : hero;
      case "spellCast":
        return event.actorId === hero.id ? { ...hero, mp: event.mp } : hero;
      case "itemUsed":
        return event.actorId === hero.id
          ? { ...hero, hp: event.hp, potions: event.remaining }
          : hero;
      case "itemDropped":
        return { ...hero, potions: hero.potions + 1 };
      case "xpGained":
        return { ...hero, xp: event.xp, level: event.level };
      case "levelUp":
        return {
          ...hero,
          level: event.level,
          hp: event.hp,
          maxHp: event.maxHp,
          mp: event.mp,
          maxMp: event.maxMp,
          str: event.str,
          def: event.def,
          mag: event.mag,
          haste: event.haste,
        };
      default:
        return hero;
    }
  }

  /** The run is on the victory or game over screen. */
  private ended(mode: Snapshot["mode"]): boolean {
    return mode === "victory" || mode === "gameOver";
  }

  /** The mob after this event. The same mob when it did not touch them. */
  private enemyAfter(enemy: CombatantView, event: SimEvent): CombatantView {
    switch (event.type) {
      case "damaged":
        return event.targetId === enemy.id ? { ...enemy, hp: event.targetHp } : enemy;
      case "spellCast":
        return event.actorId === enemy.id ? { ...enemy, mp: event.mp } : enemy;
      default:
        return enemy;
    }
  }
}

/** The page's one UI store. */
export const uiStore = new UiStoreController();

/** The latest snapshot. Rerenders when a new one is presented. */
export function useUiSnapshot(): Snapshot | null {
  return useStore(uiStore.api(), (state) => state.snapshot);
}

/** How many events the view has not played yet. */
export function usePendingCount(): number {
  return useStore(uiStore.api(), (state) => state.pending.length);
}

/** The command window's rows, or null while it is closed. */
export function useCommands(): UiState["commands"] {
  return useStore(uiStore.api(), (state) => state.commands);
}

/** The lines on the log, oldest first. */
export function useMessageLog(): readonly string[] {
  return useStore(uiStore.api(), (state) => state.log);
}

/** How long the run lasted, once it has ended. Null before that. */
export function usePlayMs(): number | null {
  return useStore(uiStore.api(), (state) => state.playMs);
}
