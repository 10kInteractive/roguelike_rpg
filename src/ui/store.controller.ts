import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { SimEvent, Snapshot } from "../sim/game.types";
import type { UiState } from "./store.types";

/**
 * The overlay's copy of the run: the latest snapshot, and the events still
 * waiting to play.
 *
 * The sim decides outcomes. This store only remembers what the overlay and
 * the view are working through. One per page.
 */
export class UiStoreController {
  /** The zustand store React subscribes to. */
  private readonly store: StoreApi<UiState>;

  constructor() {
    this.store = createStore<UiState>(() => ({ snapshot: null, pending: [] }));
  }

  /** Replaces the snapshot with the sim's latest. */
  present(snapshot: Snapshot): void {
    this.store.setState({ snapshot });
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

  /** The view finished the oldest waiting event. */
  played(): void {
    if (this.store.getState().pending.length === 0) return;
    this.store.setState((state) => ({ pending: state.pending.slice(1) }));
  }

  /** The snapshot the overlay is showing, or null before a run starts. */
  snapshot(): Snapshot | null {
    return this.store.getState().snapshot;
  }

  /** Events still waiting to play, oldest first. */
  pending(): readonly SimEvent[] {
    return this.store.getState().pending;
  }

  /** The zustand store, so a React hook can subscribe. */
  api(): StoreApi<UiState> {
    return this.store;
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
