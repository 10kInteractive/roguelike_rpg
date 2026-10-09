import * as z from "zod";

/** A dotted id such as `mob.slime` or `spell.ember`. */
export function namespaced(prefix: string) {
  return z.string().regex(new RegExp(`^${prefix}\\.[a-z0-9_]+$`), `${prefix} id`);
}

const spellId = namespaced("spell");
const itemId = namespaced("item");
const mobId = namespaced("mob");
const element = z.enum(["fire", "ice"]);
const weight = z.number().positive();

export const manifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+(\.[a-z0-9_]+)+$/, "bundle id"),
  version: z.number().int().positive(),
  extends: z.array(z.string()),
  files: z.object({
    rules: z.string(),
    hero: z.string(),
    spells: z.string(),
    items: z.string(),
    mobs: z.string(),
    encounters: z.string(),
    biomes: z.array(z.string()).min(1),
    assets: z.string(),
  }),
});

export const rulesSchema = z
  .object({
    turnBase: z.number().positive(),
    spreadMin: z.number(),
    spreadMax: z.number(),
    critChance: z.number().min(0).max(1),
    critMultiplier: z.number().positive(),
    weaknessMultiplier: z.number().positive(),
    resistanceMultiplier: z.number().positive(),
    defendMultiplier: z.number().positive(),
    fleeBase: z.number(),
    fleePerPoint: z.number(),
    fleeMin: z.number().min(0).max(1),
    fleeMax: z.number().min(0).max(1),
    fieldTickRate: z.number().positive(),
    heroWalkSpeed: z.number().positive(),
    heroCollisionRadius: z.number().positive(),
    minEncounterDistance: z.number().nonnegative(),
    levelCap: z.number().int().positive(),
    xpPerLevel: z.number().positive(),
  })
  .refine((rules) => rules.spreadMin < rules.spreadMax, "spreadMin must be below spreadMax")
  .refine((rules) => rules.fleeMin <= rules.fleeMax, "fleeMin must be at most fleeMax");

export const heroSchema = z.object({
  id: namespaced("hero"),
  name: z.string().min(1),
  hp: z.number().int().positive(),
  mp: z.number().int().nonnegative(),
  str: z.number().int(),
  def: z.number().int(),
  mag: z.number().int(),
  haste: z.number().positive(),
  growth: z.object({
    hp: z.number().int(),
    mp: z.number().int(),
    str: z.number().int(),
    def: z.number().int(),
    mag: z.number().int(),
    haste: z.number(),
  }),
  spells: z.array(spellId),
  items: z.array(z.object({ id: itemId, count: z.number().int().positive() })),
});

export const spellsSchema = z.object({
  spells: z.array(
    z.object({
      id: spellId,
      element,
      power: z.number().int().positive(),
      cost: z.number().int().positive(),
    }),
  ),
});

export const itemsSchema = z.object({
  items: z.array(
    z.object({
      id: itemId,
      heal: z.number().int().positive(),
    }),
  ),
});

const attackAction = z.object({ type: z.literal("attack"), weight });
const spellAction = z.object({ type: z.literal("spell"), spell: spellId, weight });
const grindAction = z.object({
  type: z.literal("grind"),
  multiplier: z.number().positive(),
  weight,
});

export const mobsSchema = z.object({
  mobs: z.array(
    z.object({
      id: mobId,
      hp: z.number().int().positive(),
      str: z.number().int(),
      def: z.number().int(),
      mag: z.number().int().nonnegative(),
      mp: z.number().int().nonnegative().optional(),
      haste: z.number().positive(),
      element: element.optional(),
      weak: element.optional(),
      resists: element.optional(),
      xp: z.number().int().nonnegative(),
      potionDrop: z.number().min(0).max(1).optional(),
      miniboss: z.boolean().optional(),
      actions: z
        .array(z.discriminatedUnion("type", [attackAction, spellAction, grindAction]))
        .min(1),
    }),
  ),
});

export const encountersSchema = z.object({
  terrains: z.array(
    z.object({
      id: namespaced("terrain"),
      rate: z.number().min(0).max(1),
      packs: z.array(
        z.object({
          weight,
          groups: z
            .array(
              z.object({
                id: mobId,
                min: z.number().int().positive(),
                max: z.number().int().positive(),
              }),
            )
            .min(1),
        }),
      ),
    }),
  ),
});

export const biomeSchema = z.object({
  id: namespaced("biome"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  miniboss: mobId,
  minibossDistance: z.number().positive(),
  minibossRadius: z.number().positive(),
});

export const assetsSchema = z.object({
  packs: z.array(
    z.object({
      id: z.string().regex(/^[a-z0-9_]+(\.[a-z0-9_]+)*$/, "pack id"),
      load: z.enum(["immediate", "afterBoot", "lazy"]),
      assets: z.array(
        z.object({
          id: z.string().regex(/^[a-z0-9_]+(\.[a-z0-9_]+)+$/, "asset id"),
          file: z.string().min(1),
        }),
      ),
    }),
  ),
});

export type Bundle = {
  manifest: z.infer<typeof manifestSchema>;
  rules: z.infer<typeof rulesSchema>;
  hero: z.infer<typeof heroSchema>;
  spells: z.infer<typeof spellsSchema>;
  items: z.infer<typeof itemsSchema>;
  mobs: z.infer<typeof mobsSchema>;
  encounters: z.infer<typeof encountersSchema>;
  biomes: z.infer<typeof biomeSchema>[];
  assets: z.infer<typeof assetsSchema>;
};
