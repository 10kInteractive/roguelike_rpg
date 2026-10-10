/** The hero's level, XP, and stats while a win is being applied. */
export type HeroProgress = {
  /** Current level. Prototype one starts at 1 and caps at 10. */
  level: number;
  /** XP toward the next level, after earlier levels have been paid for. */
  xp: number;
  /** Hit points right now. */
  hp: number;
  /** Hit points a heal or a level-up fills to. */
  maxHp: number;
  /** Magic points right now. */
  mp: number;
  /** Magic points a level-up fills to. */
  maxMp: number;
  /** Strength. Physical damage starts here. */
  str: number;
  /** Defense. Physical damage subtracts half of this. */
  def: number;
  /** Magic. Spell damage adds this. */
  mag: number;
  /** How quickly the hero's turn comes back around. */
  haste: number;
};

/** Stats added each time the hero gains a level. */
export type Growth = {
  /** Hit points added to the maximum. */
  hp: number;
  /** Magic points added to the maximum. */
  mp: number;
  /** Strength added. */
  str: number;
  /** Defense added. */
  def: number;
  /** Magic added. */
  mag: number;
  /** Haste added. */
  haste: number;
};

export type LevelRules = {
  /** XP to leave a level. The same at every level. Prototype one uses 20. */
  xpPerLevel: number;
  /** Highest level. Prototype one uses 10. */
  levelCap: number;
  /** Stats added each level. */
  growth: Growth;
};

/** XP from a win, and each level that XP pays for. */
export type LevelEvent =
  | {
      /** The win's XP landed. Levels have not been spent yet. */
      type: "xpGained";
      /** XP this win granted. */
      amount: number;
      /** Total XP after the grant, before it is spent on levels. */
      xp: number;
      /** Level before any level this grant pays for. */
      level: number;
    }
  | {
      /** The hero gained a level. HP and MP are refilled. */
      type: "levelUp";
      /** The level just reached. */
      level: number;
      /** Hit points after the refill. */
      hp: number;
      /** New maximum hit points. */
      maxHp: number;
      /** Magic points after the refill. */
      mp: number;
      /** New maximum magic points. */
      maxMp: number;
      /** Strength after the growth. */
      str: number;
      /** Defense after the growth. */
      def: number;
      /** Magic after the growth. */
      mag: number;
      /** Haste after the growth. */
      haste: number;
    };

/** The hero after a win's XP is spent, and what happened along the way. */
export type LevelGain = {
  /** The raised hero. The hero passed in is left alone. */
  hero: HeroProgress;
  /** `xpGained`, then one `levelUp` per level reached. */
  events: LevelEvent[];
};
