import { pickWeighted } from "../combat/weighted";
import type { Rng } from "../rng";
import type {
  EncounterEvent,
  EncounterGroup,
  EncounterState,
  EncounterTables,
  Miniboss,
  StickHold,
} from "./encounters.types";
import type { Terrain } from "./map";
import { type FieldGrid, heroRadius, move, type Position, type Stick } from "./movement";

/**
 * Walks the hero across a meadow until a fight starts.
 *
 * Each full tile of distance on grass, forest, or path rolls that terrain's
 * rate. The roll succeeds when it is below the rate. A success picks a pack
 * by weight, then a count in each group. Touching the miniboss starts its
 * fight instead, and that touch spends no encounter roll. The hold stops on
 * that tick.
 */
export class EncounterWalkController {
  /** Where the hero is standing. */
  position: Position;

  /** Partial tiles walked on each terrain, and tiles since the last fight. */
  private readonly state: EncounterState;

  /** The meadow the hero is crossing. */
  private readonly field: FieldGrid;

  /** Encounter rates for grass, forest, and path. */
  private readonly tables: EncounterTables;

  /** Tiles that must pass between fights. */
  private readonly minDistance: number;

  /** Encounter rolls: the rate, the pack, and each group's count. */
  private readonly rng: Rng;

  /** When set, touching this circle starts its fight and ends the hold. */
  private readonly miniboss?: Miniboss;

  /**
   * Starts ready for the first tile to roll.
   *
   * `distanceSinceFight` begins at the minimum gap, so the opening tile can
   * start a fight. After a fight it returns to zero and the next tiles inside
   * the gap do not roll.
   */
  constructor(input: {
    /** Where the hero is standing. */
    position: Position;
    /** The meadow the hero is crossing. */
    field: FieldGrid;
    /** Encounter rates for grass, forest, and path. */
    tables: EncounterTables;
    /** Tiles that must pass between fights. */
    minDistance: number;
    /** Encounter rolls: the rate, the pack, and each group's count. */
    rng: Rng;
    /** When set, touching this circle starts its fight and ends the hold. */
    miniboss?: Miniboss;
  }) {
    this.position = input.position;
    this.field = input.field;
    this.tables = input.tables;
    this.minDistance = input.minDistance;
    this.rng = input.rng;
    this.miniboss = input.miniboss;
    this.state = { grass: 0, forest: 0, path: 0, distanceSinceFight: input.minDistance };
  }

  /**
   * Holds the stick for up to `ticks` and may start a fight.
   *
   * @param stick How far the left stick is pushed for this hold.
   * @param ticks How many ticks to hold it, unless a fight starts first.
   */
  holdStick(stick: Stick, ticks: number): StickHold {
    const events: EncounterEvent[] = [];
    let distance = 0;

    if (this.touchesMiniboss()) {
      return this.contact(events, 0, distance);
    }

    for (let tick = 0; tick < ticks; tick++) {
      const next = move(this.position, stick, 1, this.field);
      const step = Math.hypot(next.x - this.position.x, next.y - this.position.y);
      this.position = next;
      distance += step;
      this.state.distanceSinceFight += step;

      // Touching the miniboss starts its fight and spends no encounter roll.
      if (this.touchesMiniboss()) {
        return this.contact(events, tick + 1, distance);
      }

      // The step counts toward the terrain under the hero.
      const terrain = this.terrainUnder();
      if (terrain !== "grass" && terrain !== "forest" && terrain !== "path") {
        continue;
      }
      this.state[terrain] += step;

      // One roll per full tile. Tiles inside the gap after a fight do not roll.
      while (this.state[terrain] >= 1) {
        this.state[terrain] -= 1;
        if (this.state.distanceSinceFight < this.minDistance) continue;
        const table = this.tables[terrain];
        if (!table || this.rng.next() >= table.rate) continue;

        const pack = pickWeighted(table.packs, this.rng.next());
        this.state.distanceSinceFight = 0;
        events.push({
          type: "encounterStarted",
          terrain,
          groups: pack.groups.map((group) => ({
            id: group.id,
            count: this.rollGroupSize(group),
          })),
        });
        return { events, ticks: tick + 1, distance };
      }
    }

    return { events, ticks, distance };
  }

  /** True when the hero's circle meets the miniboss circle. */
  private touchesMiniboss(): boolean {
    const miniboss = this.miniboss;
    if (!miniboss) return false;
    const centerX = miniboss.tile.x + 0.5;
    const centerY = miniboss.tile.y + 0.5;
    const reach = miniboss.radius + heroRadius;
    const dx = this.position.x - centerX;
    const dy = this.position.y - centerY;
    return dx * dx + dy * dy <= reach * reach;
  }

  /** The fight started by touching the miniboss. The move ends here. */
  private contact(events: EncounterEvent[], ticks: number, distance: number): StickHold {
    const miniboss = this.miniboss;
    if (!miniboss) return { events, ticks, distance };
    this.state.distanceSinceFight = 0;
    const terrain = this.terrainUnder();
    events.push({
      type: "encounterStarted",
      terrain: terrain === "forest" || terrain === "path" ? terrain : "grass",
      groups: [{ id: miniboss.id, count: 1 }],
      miniboss: true,
    });
    return { events, ticks, distance };
  }

  /** The terrain under the hero's center, or nothing if that tile is off the map. */
  private terrainUnder(): Terrain | undefined {
    const x = Math.floor(this.position.x);
    const y = Math.floor(this.position.y);
    if (x < 0 || y < 0 || x >= this.field.width || y >= this.field.height) return undefined;
    return this.field.tiles[y * this.field.width + x];
  }

  /** How many of this mob appear. A fixed group spends no roll. */
  private rollGroupSize(group: EncounterGroup): number {
    if (group.max <= group.min) return group.min;
    const span = group.max - group.min + 1;
    return group.min + Math.floor(this.rng.next() * span);
  }
}
