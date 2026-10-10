# Game Design Document

Source of truth for mechanics. Ideas start in `docs/brainstorm.md`; build details live in `docs/techstack.md` and the prototype plans under `docs/prototypes/`.

Working title: TBD

## How to read this doc

Every mechanic has two phases:

- **Prototype** — the smallest version that proves the idea. Concrete rules and formulas. Numbers live in each prototype's content bundle, not here.
- **North star** — where the mechanic is headed. Direction and ideas, not commitments.

Prototype rules can change once we play them. North star ideas move into the prototype column only when a prototype needs them.

## Pitch

A light sci-fi / fantasy RPG in NES clothes. One hero walks a lush 3/4 procedural world and falls into turn-based fights, Final Fantasy style. Each run pushes three stages deeper into a zone. You bring in a loadout from your home stash, build a kit from eager drops, and pick up run boons along the way. At every inn you choose: push in or opt out. Opt out and you keep everything you carry. Die and you lose everything outside your anchored slots.

## Pillars

1. **NES RPG heart.** Command menus, a character sheet, named loot, the first slime in the grass.
2. **Turn-based, never twitch.** Combat waits for you. Speed matters through the haste stat, not reflexes.
3. **Push in or opt out.** Extraction tension at every inn: one more stage for better loot, or cash out.
4. **Build a kit, spice the run.** Gear is the long-term character; boons are this run's personality.
5. **Swords and lasers.** Fantasy with a tech undercurrent everywhere. A cyborg hunter in a world that still has slimes.

## Scope by prototype

| Mechanic | Prototype one | Later prototypes | North star |
| --- | --- | --- | --- |
| Field: procedural map, analog movement | yes | yes | yes |
| Random encounters | yes | yes | yes |
| Visible miniboss | yes, ends the run | yes | farmable packs |
| Combat: haste turns, command window | yes | yes | yes |
| Elements | fire and ice | wheel | full wheel |
| Levels and XP | yes | yes | yes |
| Gear and slots | no | yes | yes |
| Boons | no | yes | yes |
| Run stages, inns, stage bosses | no | yes | yes |
| Extraction, stash, anchored slots | no | yes | yes |
| Durability | no | yes | yes |
| Town, skill tree | no | stub | yes |
| Races | no | stub | yes |
| Guests and pets | no | no | yes |
| Day / night, global illumination | no | yes | yes |
| Music | no | yes | yes |

## Core loop

### Prototype

Spawn on a fresh map. Walk. Random fights start as you walk. A miniboss stands visible somewhere on the map; you can walk around it or bump into it. Win fights for XP and levels. Beating the miniboss ends the run with a victory screen and run stats. Dying ends it with a game over screen and the same stats. Either way, start again on a new seed.

Target length: **10–15 minutes**, about **10 fights** before the hero is ready for the miniboss.

### North star

1. Town: pick race and class, spend on the skill tree, choose a loadout from the home stash (or take the free loadout), repair gear.
2. Stage one: walk a procedural map, fight random encounters, choose whether to engage miniboss packs.
3. Gear drops eagerly; class-colored boon drafts arrive on a cadence.
4. Stage boss, then an inn: rest, heal, shop, repair. Push in or opt out.
5. Stages two and three go deeper into the zone: harder, richer, biomes reroll.
6. Opt out or kill the final boss: everything you carry goes home. Die: lose everything outside anchored slots.

Target for a ready, full clear: about 40–60 minutes.

## Hero

### Prototype

- One hero, class **Strider**: general purpose, good general stats, nothing exceptional.
- One race. No race choice.
- Stats:

| Stat | Short | Does |
| --- | --- | --- |
| Hit points | HP | Damage you can take. Zero means death. |
| Magic points | MP | Spent to cast spells. |
| Strength | STR | Physical damage. |
| Defense | DEF | Reduces physical damage taken. |
| Magic | MAG | Spell damage. |
| Haste | HST | How often you act. See combat. |

- Starts at level 1 knowing two spells: one fire, one ice.

### North star

- More classes; class colors the boon drafts.
- **Races** (human, reptilian, cybernetic, more) are art plus stat boosts, and they change augment and trinket slot counts.
- Added stats as needed: luck (crits, drops), resistance (magic defense), accuracy and evasion.
- One avatar on the field always. Combat can grow guest slots later (strangers, pets) as extra haste actors.

## Leveling

### Prototype

- Every defeated enemy gives its XP reward. The fight ends when either side reaches zero HP, and that side is defeated. Dying or fleeing grants no XP.
- The XP to leave the current level is 6 × that level. One grant can raise several levels. Each level adds HP +6, MP +2, STR +2, DEF +1, MAG +1, and HST +1, then fully restores HP and MP.
- The level cap is 10. At the cap, a win still grants XP and does not raise the level or stats.

### North star

- Levels are per run in hardcore mode; persistent power comes from gear and the skill tree.
- XP gain bonuses come from the skill tree.
- Whether levels persist in a future bosskill mode is undecided.

## Field

### Prototype

- **One procedural biome** generated from the run seed: a grid of tiles with height, rendered as 3D low-poly terrain with pixel textures.
- Terrain types: grass, forest, path (walkable); water, mountain (blocked). Each walkable type has its own encounter rate.
- **Free analog movement.** The hero moves continuously in any direction: full analog on a gamepad stick, eight directions on a keyboard. The map is still a tile grid underneath (for generation, terrain type, and collision), but the hero's position is continuous and collides with blocked tiles.
- The simulation advances movement in **fixed time steps** so it stays deterministic and replayable; the view smooths between steps. The field steps at 30 ticks per second. A full stick moves the hero 4 tiles per second. The stick is an integer pair from −64 to 64. A vector longer than 1 is normalized, so a diagonal step covers the same distance as a step along an axis. On a gamepad, the left stick ignores the inner 20% of an axis and the rest scales up so the outer edge is a full press. The d-pad is a full press on that axis and overrides the stick there.
- The hero is a circle of radius 0.3 tiles. Water, mountain, and the ground outside the map are blocked. A step that would enter blocked ground is taken along the free axis, so the hero slides along the edge.
- **3/4 camera** that follows the hero.
- **Random encounters by distance:** every tile's worth of distance walked rolls against the current terrain's rate. The roll succeeds when it is below the rate. A roll equal to the rate does not. Prototype one leaves 4 tiles between fights, and tiles inside that gap do not roll. A success picks a pack by weight, then each group rolls a count from its minimum through its maximum. A move of several ticks stops on the tick the fight starts.
- **Visible miniboss:** placed far from the spawn on reachable ground. It stands still. It is a circle of radius 0.8 around the center of its tile. The fight starts when the hero's circle touches that circle, and that step ends the move. Walk around it to avoid it.
- **Walking policies:** the fighter and the caster wander. One roll picks one of eight directions, and they hold that stick for 30 ticks, one second. Roll 0 is east, then the compass turns counterclockwise: northeast, north, northwest, west, southwest, south, southeast. A roll on a boundary belongs to the next direction. The grinder wanders the same way until level 5, then walks to the miniboss. That route is the shortest path on the walkable tile grid, four directions, one tile per step. An earlier tile wins a tie. Each batch of 30 ticks steers toward the center of the next tile. If the miniboss cannot be reached, the grinder wanders. In a fight the grinder uses the fighter's choices: Fight, and a potion below 30% HP.
- **A pack is fought one mob at a time.** The hero's HP, MP, potions, and XP carry to the next mob. A flee or a defeat ends the pack. A flee grants nothing. After a win, a regular mob drops a potion when the roll is below its drop chance. A roll equal to the chance does not.
- **A field sweep** plays seeds 1 through N with the grinder and prints the miniboss win rate, the average level when that fight starts, fights per run, distance walked, estimated play time, potions drunk, and deaths by mob. Play time is an estimate: 3 seconds per hero decision, 1.5 seconds per enemy action, 2 seconds per fight, plus the distance walked divided by 4 tiles per second. Encounter rolls and potion drops use one generator. Wander and enemy picks use a second. Combat rolls use a third. All three start from the run seed.
- The generator guarantees the miniboss is reachable from the spawn. Both noise layers are seeded values every 8 tiles, blended east–west and north–south between them, so neighboring tiles change gradually in every direction. Height noise below 0.38 is water and above 0.70 is mountain. The band between is grass, and a second noise layer turns grass into forest above 0.55. The spawn is a walkable tile. The miniboss stands at least its distance away, 20 tiles in the meadow. A path of path tiles runs from the spawn to the miniboss, so the two stay connected when the noise would wall them off.

### North star

- **Miniboss packs** that wander or patrol, respawn, and carry loot tables worth farming for specific drops.
- Several biomes per level on a **meta-map**. Biomes roll across the three stages; depth sets difficulty, biome sets look and mob families.
- Lush detail close to the camera, day / night, approximate global illumination.
- Landmarks, treasure, and trinket-driven overworld verbs ("find treasure").

## Combat

### Prototype

- A fight opens a **combat screen over the field**. The meadow fades to black, the combat stage fades in, and the field pauses. Leaving a fight fades back to the meadow. The combat stage is its own simple 3D scene matching the biome.
- Hero on one side, 1–3 enemies on the other, Final Fantasy style.
- **Command window:** Fight, Magic, Item, Defend, Run.

#### Turn order: haste

- Every actor has a **next-turn time**. The actor with the lowest time acts next. A fight starts with every time at 0, so the first turn is a tie.
- After acting, an actor's time increases by a fixed base amount divided by its haste. Twice the haste means twice the turns.
- Ties go to the higher haste, then to the hero, then to whoever is earlier in the fight's actor list.
- This interleaves hero and enemy turns; nobody waits for a whole team to finish.

#### Actions

| Command | Effect |
| --- | --- |
| Fight | Physical attack on one enemy. |
| Magic | Cast a known spell on one enemy. Costs MP. |
| Item | Use a consumable (potions in prototype one). |
| Defend | Halve damage taken until your next turn. |
| Run | Try to flee. Chance rises with your haste versus the enemies'. A failed attempt costs the turn. You can't run from a miniboss. |

The Run chance is 50% plus 5% per point of hero haste over the enemies' average haste, clamped to 10%–90%. The attempt succeeds when the roll is below that chance. A roll equal to the chance fails. Success ends the fight. Failure costs the turn. A miniboss attempt fails without a roll and still costs the turn.

#### Damage

- **Physical:** attack power (STR) minus half the target's DEF, times a small random spread. The result is rounded down to an integer. Minimum 1.
- **Magic:** spell power plus MAG, times the element multiplier, times a small random spread. The result is rounded down to an integer. Minimum 1. Ignores DEF. Spells do not crit.
- **Critical hits:** a flat chance on physical attacks. Prototype one uses 5% and ×1.5. The spread is rolled first, then the crit chance. A crit multiplies that hit's damage by the multiplier and rounds down again.
- **Defend:** incoming damage, including a spell or a crit, is multiplied by the defend multiplier and rounded down again. Minimum 1. Prototype one uses ×0.5. The effect ends at the start of that actor's next turn, before they act.
- **Grind:** a physical attack, then multiplied by the action's multiplier and rounded down again. Prototype one's sentinel uses ×1.5. The order is spread, crit, grind, then Defend.
- All randomness comes from the run's seeded RNG.

#### Enemies

- Each mob has stats, an element, weaknesses and resistances, MP, and a short list of actions with weights. The AI picks by weight and has no other tactics. One roll in [0, 1) is multiplied by the total weight and walks the list in order. Each action covers a slice of its weight, and a roll on a boundary belongs to the next action. A spell the actor cannot afford is Fight instead, without rolling again. Prototype one gives the ember imp, the frost moth, and the shade 9 MP.
- The dire wolf and the shade are forest encounters only. Both are a step above the slime, the imp, and the moth. The wolf only attacks. The shade is weak to fire, resists ice, and casts Frost.

#### Outcomes

- **Win:** all enemies at zero HP. Gain XP and any drops, return to the field. Beating the miniboss ends the run in victory.
- **Flee:** return to the field, no rewards.
- **Lose:** hero at zero HP. Game over.

#### Run stats

Shown on both the victory and game over screens: play time, fights won, fights fled, level reached, damage dealt and taken, potions used, distance walked, the seed, and (on game over) what killed you.

The sim counts these as the run goes. Each walk adds the distance actually moved, including a walk that stops for a fight. Each finished fight adds the hero's damage dealt and taken, every potion the hero drank (a drink at full HP still counts), and whether the fight was a win or a flee. A defeat records the mob that landed it and leaves the level where it was. Play time is the one number the UI clocks.

### North star

- Special attacks and on-hit effects come from **boons**, not a baked skill list. Pure melee stays a valid build.
- Status effects (poison, stun, burn, freeze, shock).
- Guests and pets as extra haste actors.
- Multi-target attacks and spells.
- Stage bosses with phases.
- Biome-specific 3D combat backdrops with NES staging.

## Elements and tech

### Prototype

- Two elements: **fire** and **ice**.
- Each mob may be aligned to an element, be weak to one, and resist one.
- Hitting a weakness multiplies damage by the weakness multiplier; hitting a resistance multiplies it by the resistance multiplier. Prototype one uses ×1.5 and ×0.5. A hit that is neither is ×1. If an element is listed as both, the weakness multiplier applies. Multipliers live in the bundle.
- The hero's two spells cover both elements, so reading a mob and choosing the right spell is the first combat decision.

### North star

- A **wheel of 4–5 elements**, each strong against the next and weak to the previous. Working example: fire → ice → electricity → water → fire. A fifth element needs a name.
- **Tech is a material, not an element.** It is a family of weapons and augments that can deal any element: a plasma staff deals fire, a cryo rifle deals ice, a blaster could be electric.
- Tech is open to every class. Vampire Hunter D is the touchstone: a cybernetic hunter with a blade and a gun. FF3 / FF6 machina for enemies and set pieces.

## Items

### Prototype

- Consumables only: potions that restore HP. Mobs can drop them.
- A small carried stack, no inventory screen beyond the Item command.
- A potion restores a fixed amount of HP, up to the drinker's maximum. Prototype one restores 25. Drinking spends one potion and the turn. At full HP it still spends both and restores nothing. With none left, the turn passes and nothing is restored.
- The fighter Fights, and drinks a potion when HP is below 30% of maximum and one remains. At 30% the fighter Fights. With none left, the fighter Fights.
- The caster casts the known spell that matches the target's weakness, while MP can pay for it, then Fights. A target with no weakness is a Fight.
- The random policy picks one legal action: Fight, Defend, Flee, a potion when one remains, or a known spell it can pay for. It is there to find crashes.
- A run log records the seed, the bundle, every action, the outcome, and a hash of the events. Replay plays that action list again and checks the hash. Enemy picks and the random policy draw from a second generator started from the same seed, so the combat rolls stay put.
- A seed sweep plays seeds 1 through N and prints the fight count, the win rate, and deaths by mob. A flee is neither a win nor a death.

### North star

Equipment slots:

| Group | Slots |
| --- | --- |
| Armor | head, shoulders, chest, belt, legs, feet, wrists, gloves (room for 10) |
| Weapon | main hand, off hand, ranged |
| Augment | 3 to start; tech installed into the body; count varies by race |
| Trinket | 2 to start; tech or element attached to the body; count varies by race |

- Gear drops eagerly. Named, slightly silly loot.
- **Durability** wears down in normal play. Repairs cost currency (a deliberate currency sink). A piece that breaks in the field becomes unusable, or is lost; which one is undecided.

## Boons

### Prototype

Not in prototype one.

### North star

- Arrive on a regular cadence during a run, as **class-colored drafts** (pick one of several).
- They are skills, spells, effects, elemental bonuses, magic affixes, and tech effects. Not armor.
- Last for the current run only; gone on death and on extract.
- Boon reroll at the inn is undecided.

## Runs, inns, and extraction

### Prototype

Not in prototype one. A run is one map; it ends at the miniboss win or at death.

### North star

- **Hardcore mode first.** A run is one session: leave town, then death, opting out, or the final boss.
- **Three stages**, each ending in a stage boss, each deeper into the zone.
- **Inn at each stage cusp:** rest, heal, shop, repair. The inn is the extract point: **push in or opt out**.
- **Loadout:** bring whatever you are willing to risk from the home stash. A **free loadout** is always available so a bad death never locks you out.
- **Opt out or kill the final boss:** everything equipped and in the backpack goes to the home stash.
- **Die:** lose everything except what sits in **anchored slots** (Arc Raiders' safe pocket). Anchored gear still wears out.
- Storage: equipped slots, anchored slots, backpack (this run), home stash (starts at 20 slots, grows to hundreds).
- **Bosskill mode** (several deaths allowed, multi-session runs, in-run save) is parked for later.

## Meta progression

### Prototype

Not in prototype one.

### North star

- **Town / home base:** home stash, loadout screen, skill tree, shops.
- **Skill tree:** permanent numeric growth: XP gain, stat bumps. Might unlock extra anchored slots.
- **Home stash:** the long-term gear collection, filled by extraction.

## Presentation

### Prototype

- Low-poly 3D with **pixel textures** (nearest-neighbor filtering). No low-resolution render target.
- Placeholder art is fine: colored shapes with simple pixel textures.
- Menus are a DOM overlay in an NES style: bordered windows, pixel font.
- Simple lighting: a sun and a sky light. No day / night.
- A skirt of grass tiles surrounds the meadow, wide enough that the follow camera shows ground past the map edge. The sim map is unchanged, and the hero cannot walk onto the skirt.
- On a forest tile the hero stands half a body down into the canopy, so the lower half is hidden. A fight that starts there uses a deep-forest backdrop: a dark brown floor and tall dark green trees. Grass and path fights keep the meadow backdrop.
- Sound: optional placeholder blips. No music.
- Input: keyboard and gamepad, default bindings only.

### North star

- Lush, close detail; day / night; approximate global illumination.
- Biome music as layered stems that crossfade (calm, danger, combat, boss), authored by Josh.
- Every asset can start generated and be swapped for a hand-built one.
- Rebindable controls in an options screen.
- Tone: earnest, a little camp. Death can be jokey without making the world a joke.

## Open questions

- Fifth element name.
- Broken gear: unusable until repaired, or lost?
- Number of anchored slots, and how to earn more.
- Whether anchored slots accept any item or only certain groups.
- Boon reroll at the inn.
- Backpack size.
- Whether day / night changes encounter tables or is only visual.
- Meta-map shape: one continent, or town portals into biomes.
- Working title.
