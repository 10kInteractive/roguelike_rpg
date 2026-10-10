# Prototype one: combat engine and game field

A pared-down proof of concept. One hero walks a procedural map, falls into haste-ordered turn-based fights, levels up, and tries to beat a visible miniboss. Nothing else. A run takes 10–15 minutes, about 10 fights. It only needs to run locally.

Mechanics come from the **Prototype** sections of `docs/game_design.md`. Stack decisions come from `docs/techstack.md`. This plan is the build spec.

## What it must prove

1. **Combat feels good.** Haste-ordered turns, a readable command window, and the fire/ice choice make fights interesting for a few minutes of grinding.
2. **The field loop works.** Free analog walking, random encounters, and a visible miniboss you can avoid create a "one more fight before I'm ready" pull.
3. **The architecture holds.** The pure, seeded simulation runs the whole game; the Three.js view and React UI only render it.
4. **The harness works.** A headless CLI plays full runs, sweeps seeds for balance, and replays runs exactly.

## Scope

In:

- Strider hero, levels 1–10, two spells (fire, ice), potions.
- One procedural meadow map with grass, forest, path, water, mountain.
- Free analog movement with tile collision, 3/4 follow camera, random encounters by distance walked.
- Three mobs and one visible miniboss. Beating it ends the run.
- Combat: Fight, Magic, Item, Defend, Run; a message log at the base of the view.
- Victory and game over screens with run stats; restart on a new seed.
- Keyboard and gamepad with default bindings.
- Loader screen and one lazily loaded asset pack.
- Headless sim CLI with scripted policies, seed sweeps, and replay.
- CI checks on pull requests.

Out: deploying to the server, gear and slots, boons, stages, inns, extraction, stash, durability, town, skill tree, races, guests, miniboss farming, day / night, global illumination, music, rebinding, LLM playtesters.

## Player experience

1. The loader shows progress, then the hero appears on a meadow.
2. The hero walks freely with the stick or keys, sliding along water and mountain edges. Walking through grass and forest occasionally triggers a fight. The meadow fades to black, then the combat screen fades in. Leaving fades back.
3. The player picks commands; enemies act on their turns; the log at the base of the view narrates, and clears when the fight ends.
4. An Ember Imp resists fire but melts to ice. A Frost Moth is fast and fragile and hates fire. Slimes are just slimes. A Dire Wolf and a Shade show up only in the forest, and both hit harder than those three.
5. Wins give XP. Level-ups restore HP and MP. Potions drop now and then.
6. A Rust Sentinel stands on the far side of the map. Walking around it is safe. Touching it starts a fight you can't run from. After about 10 fights the hero should be ready for it.
7. Beat it: victory screen with run stats. Die: game over screen with the same stats and what killed you. Either way, restart on a new seed.

## Directory structure

Shared engine code lives in `src/` and grows across prototypes. Each prototype is a thin folder: an entry page, a config that turns engine features on, and its content bundle. Entries marked *planned* do not exist yet. Add a directory when the code needs one, and record it here and in `docs/techstack.md`.

```
index.html                  launcher page linking to each prototype
vite.config.ts              multi-page build: launcher plus each prototype entry
tsconfig.json               base config (browser, React JSX)
tsconfig.sim.json           src/sim only, no DOM library
biome.json
package.json
src/                        shared engine
  boot/                     planned: loader screen, dynamic import of the game
  sim/                      pure, seeded game rules. The only folder that decides outcomes.
    utils/                  seeded generator, hashToUnit, weighted picks
    combat/                 HasteTurnQueue, OneOnOneFightController, CombatActionPolicy
      utils/                damage, flee chance, leveling formulas
    field/                  meadow generation, movement and collision, EncounterWalkController, FieldWalkPolicy
    run/                    GrinderFieldRunController, PackFightController, RunStatistics
    game.controller.ts      GameSimController: one run, one action at a time
    index.ts                createSim, observe, legalActions, act
  harness/                  headless play of the sim: replay, combat sweep, field sweep
  content/                  zod schemas, the bundle loader, bundle rows into fighters and fight rules
  runtime/                  GameRuntimeController: reads `?seed`, `?camera`, `?combat`, `?webgl`, loads the
                            bundle, starts the renderer, and opens the field or a fight.
                            GameLoopController: walks the field and plays each fight until the run ends
  view/                     Three.js. RenderLoopController owns the canvas, the camera, and the one render loop.
    art/                    shared by both scenes: placeholder models, sun and sky, terrain texture ids
    field/                  FieldViewController, FieldSceneController, FollowCameraController,
                            FixedStepClock, PositionInterpolator, StandInWalkController
    combat/                 CombatViewController, CombatSceneController, CombatSequencerController,
                            TweenController, FloatingTextController
  ui/                       React DOM overlay. UiStoreController: the latest snapshot and the events waiting to play
    components/             one folder per component: controller, markup, styles, types
  input/                    KeyboardController and GamepadController: held keys or the pad as a stick, and menu presses
  assets/                   AssetLoaderController: loads a manifest pack with progress. Built URLs for
                            every file under /assets, so production builds ship them
  debug/                    DebugLogController, DebugWatchController, dev panel
prototypes/
  one/
    index.html              entry page
    index.css               page shell: the stage fills the window, and the view and overlay sit in it
    main.tsx                mounts the overlay and starts GameRuntimeController with this bundle
    bundle-source.ts        gathers the bundle's JSON files through bundle.json for the browser
    config.ts               planned: engine features this prototype uses
    bundle/                 content bundle (see below)
assets/
  authored/                 planned: hand-built, wins over generated
  generated/                tool output, each file with a `.json` provenance sidecar
tools/                      Node scripts. Their tests run with the rest under `npm run test`
  sim.ts                    headless sim CLI. The only place that prints.
  sim-commands.txt          copyable CLI lines
  read-bundle.ts            reads a bundle folder from disk for the CLI and checks
  check-content.ts          validates every bundle
  check-sim-purity.ts       fails if src/sim uses Math.random
  gen-placeholders.ts       writes placeholder pixel textures: `npm run assets:placeholders`
  placeholders/             PixelImage (a small PNG encoder) and the terrain texture recipes
tests/
  e2e/                      planned: Playwright
docs/
  prototypes/
    one.plan.md             this file
  references/               how existing systems work, such as terrain generation
.github/workflows/          CI
```

The harness may import the sim. The sim never imports the harness, the view, the UI, or input. `src/sim` stays on `tsconfig.sim.json` with no DOM library, and the purity check covers that folder.

### Code conventions

`.cursor/skills/controller-classes/SKILL.md` holds the full rule. In short:

- Logic that keeps state between calls is a class in `{area}.controller.ts`. Callers construct it, then ask it to advance: `new OneOnOneFightController(input).resolve()`, `encounter.holdStick(stick, ticks)`.
- Choices that share fixed inputs are a policy class, built once and asked per choice: `CombatActionPolicy`, `FieldWalkPolicy`.
- A helper for one class is a private method. A loose helper must need no state and be used by more than one class.
- Rule formulas (damage, flee chance, leveling, movement, meadow generation) stay in their own tested `{area}.ts` files, because their tests pin the numbers in `docs/game_design.md`.
- A page-wide owner is a singleton: the class plus one exported instance, such as `debugLog` and `debugWatches`. `src/sim` has no singletons.
- Each area keeps its types, tuning numbers, and tests in `{area}.types.ts`, `{area}.constants.ts`, and `{area}.tests.ts`. Callers import types from `.types.ts` directly.
- Area names are kebab-case and leave out the folder, so the field walk policy is `field/policy.controller.ts`.
- Exported formulas say the action and what it acts on, such as `calculatePhysicalDamage` and `moveHeroAlongStick`. Controller methods are short verbs, because the class already names the thing.

| Class | Owns | Methods |
| --- | --- | --- |
| `SeededRandomGenerator` | The mulberry32 counter for one seed. | `next()` |
| `HasteTurnQueue` | Who is waiting, and when each actor may act again. | `act()`, `upcoming(count)` |
| `OneOnOneFightController` | The hero and enemy copies, who is defending, turns taken, and the event list. | `resolve()` |
| `EncounterWalkController` | Hero position, distance walked per terrain, and distance since the last fight. | `holdStick(stick, ticks)` |
| `RunStatistics` | The end-screen scoreboard for one run. | `addWalk`, `addFight`, `snapshot()` |
| `GrinderFieldRunController` | The hero carried between fights, the three generators, and the meadow. | `play()` |
| `CombatActionPolicy` | Known spells and the roll for random choices. | `chooseFighter`, `chooseCaster`, `chooseRandom` |
| `FieldWalkPolicy` | The meadow, the miniboss tile, and the direction roll. | `chooseFighter`, `chooseCaster`, `chooseGrinder` |

Conventions for future prototypes:

- A new prototype is a new folder `prototypes/<name>/` and a plan at `docs/prototypes/<name>.plan.md`.
- Prototypes never import from each other. Anything shared moves into `src/` or into a shared bundle.
- When a prototype has done its job, tag it in git (`prototype-one`) so it can always be rebuilt. CI only builds prototypes still in the launcher.

## Tech stack configuration

### Dependencies

Latest stable versions at setup.

| Package | Purpose |
| --- | --- |
| `three` | Engine foundation; `WebGPURenderer` from `three/webgpu` |
| `react`, `react-dom` | UI overlay |
| `zustand` | UI store mirroring sim snapshots |
| `zod` | Bundle schemas and validation |

Dev dependencies:

| Package | Purpose |
| --- | --- |
| `vite` | Dev server and build (Vite 8 needs Node 20.19+ or 22.12+; we have 22.14) |
| `typescript`, `@types/three`, `@types/react`, `@types/react-dom` | Types |
| `@vitejs/plugin-react` | React support in Vite |
| `@biomejs/biome` | Lint and format |
| `vitest` | Unit tests |
| `@playwright/test` | Browser end-to-end tests |
| `tsx` | Runs TypeScript tools (sim CLI, checks) in Node |

### npm scripts

| Script | Runs |
| --- | --- |
| `dev` | Vite dev server |
| `build` | Type-check, then Vite production build to `dist/` |
| `preview` | Serve the built `dist/` locally |
| `typecheck` | `tsc --noEmit` for both tsconfigs |
| `lint` | `biome lint .` |
| `format` | `biome format --write .` |
| `test` | Vitest |
| `test:e2e` | Playwright |
| `content:check` | Validate all bundles |
| `sim:purity` | Purity check on `src/sim` |
| `sim` | Headless sim CLI |
| `check` | Everything CI runs: typecheck, `biome check .`, test, sim:purity, content:check |

### Config notes

- **Vite:** multi-page inputs (launcher and `prototypes/one/index.html`). `base` comes from the `BASE_PATH` environment variable: `/roguelike_rpg/` for production builds, `/` locally.
- **TypeScript:** strict mode. `tsconfig.sim.json` covers `src/sim` with only ES libraries, so DOM globals fail type-checking.
- **Biome:** recommended rules. An override for `src/sim/**` restricts imports of `three`, `react`, `zustand`, and anything in `src/view`, `src/ui`, or `src/input`.
- **`.gitignore` additions:** `runs/` (sim logs), `playwright-report/`, `test-results/`.
- **Remove** `server.js` and `src/index.js`; Vite replaces them.

### CI and deploy

- On pull requests: `npm ci`, then `npm run check`, then `npm run build`.
- **Prototype one is local only.** `npm run dev` for play, `npm run build && npm run preview` to check the production build.
- Deploying to `joshbosworth.com/roguelike_rpg` comes later (see `docs/techstack.md`). The `BASE_PATH` setting is there from day one so the build is ready for it.

## The simulation interface

The sim takes a validated bundle and a seed. It does no I/O; the browser and the CLI each load the bundle and hand it in.

```ts
type Action =
  // x and y are integers from -64 to 64 (a quantized stick vector).
  // ticks advances several fixed steps at once; the harness uses it, the browser sends 1.
  | { type: "move"; x: number; y: number; ticks?: number }
  | { type: "fight"; target: ActorId }
  | { type: "cast"; spell: SpellId; target: ActorId }
  | { type: "item"; item: ItemId }
  | { type: "defend" }
  | { type: "run" };

interface Sim {
  observe(): Snapshot;        // what the player can see right now
  legalActions(): Action[];   // what the player may do right now
  act(action: Action): SimEvent[];
}

function createSim(options: { bundle: Bundle; seed: number }): Sim;
```

The seeded generator is mulberry32. `new SeededRandomGenerator(seed)` keeps a 32-bit state, and `next()` returns a number in [0, 1). The same seed produces the same sequence in the browser and in Node. A seed is read as an unsigned 32-bit integer. Scripted tests still pass any `Rng`, which is anything with `next()`.

- **One player action in, all consequences out.** After the hero acts, the sim runs enemy turns until the hero's next decision and returns every event in order. The view's combat sequencer plays them back one by one.
- **Snapshot** has a `mode` (`field`, `combat`, `victory`, `gameOver`), hero stats, the field (map, hero position and facing, miniboss), in combat the actors and upcoming turn order, and the run stats.
- `legalActions()` lists concrete actions in combat. In the field it returns the move action with its allowed range, since movement is continuous.

### Field movement

- The sim steps the field at a **fixed 30 ticks per second**. Each `move` action is one tick (or `ticks` of them) with a stick vector.
- The stick vector is **quantized to integers** (−64 to 64 per axis) so run logs are compact and replays are exact. Vectors longer than 1 are normalized, so keyboard diagonals aren't faster.
- Position is continuous, in tile units. The hero is a small circle that **collides with blocked tiles** and slides along their edges.
- Movement math uses only addition, multiplication, division, and square root. Those are exact in standard floating point, so a replay matches in every browser and in Node. No trig in the sim.
- **Encounters by distance:** distance walked accumulates per terrain. Each full tile of distance rolls against that terrain's encounter rate. A minimum distance must pass between fights.
- **Miniboss contact:** touching its radius starts the fight. A `move` batch stops early at an encounter or contact and returns the events up to that point.
- The browser view runs a **fixed-timestep loop**: it steps the sim at 30 Hz with the current input vector and renders at the display rate, interpolating between the last two sim states.
- **Events** are small tagged records: `encounterStarted`, `turnStarted`, `attacked`, `damaged`, `spellCast`, `itemUsed`, `defended`, `fleeAttempted`, `actorDefeated`, `combatEnded`, `xpGained`, `levelUp`, `itemDropped`, `victory`, `gameOver`. Field movement isn't an event; the view reads position from the snapshot each tick.
- Restarting is creating a new sim with a new seed; the sim itself has no restart action.

## Game bundles

### Definition

A **bundle** is a versioned package of game data the engine loads to make something playable. Code is the engine; data is the bundle.

A bundle contains:

- **Rules:** tuning numbers for engine systems (turn base, damage spread, element multipliers, encounter rates).
- **Content:** the hero, mobs, spells, items, encounter tables, biomes.
- **Asset manifest:** logical asset IDs mapped to files, grouped into packs.

Rules for bundles:

- Bundle files are **JSON**, so they're easy for people, tools, and LLMs to write.
- Every file is validated by a **zod schema** in `src/content`, both at load time and in `npm run content:check`. The schemas also provide the TypeScript types the sim uses.
- **References must resolve.** An encounter that names `mob.ember_imp` fails validation if that mob doesn't exist. An asset ID with no file falls back to a placeholder and logs a warning.
- **IDs are namespaced strings:** `mob.slime`, `spell.ember`, `item.potion`, `biome.meadow`.
- **Layering (later):** a bundle can `extend` other bundles, and later bundles override entries by ID. Prototype one uses a single bundle with no layering, but the manifest has the field so later prototypes can share a core bundle.
- A prototype's `config.ts` says which bundle to load and which engine features are on. The bundle never turns code on or off.

### Layout

```
prototypes/one/bundle/
  bundle.json           id, version, extends, list of files
  rules.json            combat, field, and leveling tuning
  hero.json             Strider base stats, growth, starting spells and items
  spells.json
  items.json
  mobs.json             includes the miniboss
  encounters.json       weighted packs per terrain
  biome.meadow.json     terrain types, generation parameters, miniboss placement
  assets.json           logical IDs, files, packs
```

`bundle.json`:

```json
{
  "id": "prototype.one",
  "version": 1,
  "extends": [],
  "files": {
    "rules": "rules.json",
    "hero": "hero.json",
    "spells": "spells.json",
    "items": "items.json",
    "mobs": "mobs.json",
    "encounters": "encounters.json",
    "biomes": ["biome.meadow.json"],
    "assets": "assets.json"
  }
}
```

### Prototype one bundle contents

Starting numbers. They are first guesses for the balance sweeps to correct.

**Rules**

| Rule | Value |
| --- | --- |
| Turn base (time added per action is base ÷ haste) | 100 |
| Damage random spread | 0.9 to 1.1 |
| Critical chance and multiplier | 5%, ×1.5 |
| Weakness and resistance multipliers | ×1.5, ×0.5 |
| Defend damage multiplier | ×0.5 |
| Flee chance | 50% + 5% per point of hero haste over the enemies' average, clamped 10%–90% |
| Field tick rate | 30 per second |
| Hero walk speed | 4 tiles per second |
| Hero collision radius | 0.3 tiles |
| Minimum distance between encounters | 4 tiles |
| Level cap | 10 |
| XP to next level | 6 × level (level 5 after about 60 XP, roughly 10 fights) |

**Hero: Strider**

| | HP | MP | STR | DEF | MAG | HST |
| --- | --- | --- | --- | --- | --- | --- |
| Level 1 | 30 | 10 | 8 | 4 | 6 | 8 |
| Per level | +6 | +2 | +2 | +1 | +1 | +1 |

Starts with spells Ember and Frost, and 3 potions.

**Spells and items**

| ID | Element | Power | Cost |
| --- | --- | --- | --- |
| `spell.ember` | fire | 8 | 3 MP |
| `spell.frost` | ice | 8 | 3 MP |
| `item.potion` | — | heals 25 HP | — |

**Mobs**

| ID | HP | STR | DEF | MAG | HST | Element | Weak | Resists | XP | Actions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `mob.slime` | 12 | 6 | 2 | 0 | 5 | — | — | — | 3 | attack |
| `mob.ember_imp` | 14 | 6 | 3 | 0 | 9 | fire | ice | fire | 5 | attack 60, Ember 40 |
| `mob.frost_moth` | 10 | 5 | 2 | 0 | 12 | ice | fire | ice | 5 | attack 60, Frost 40 |
| `mob.dire_wolf` | 22 | 9 | 4 | 0 | 8 | — | — | — | 8 | attack |
| `mob.shade` | 18 | 7 | 3 | 0 | 11 | ice | fire | ice | 8 | attack 55, Frost 45 |
| `mob.rust_sentinel` (miniboss) | 90 | 13 | 8 | 0 | 6 | — | ice | fire | 40 | attack 70, Grind (×1.5) 30 |

Every regular mob has a 15% potion drop. The Rust Sentinel is a machina, a small first hint of the tech undercurrent. Beating it ends the run, so it has no drops.

The imp and the moth have no magic, so their Ember and Frost hit for the spell's power alone, 7 or 8. A punch is 3 or 4. Strider's own spells still add his magic.

**Encounters (weights per terrain)**

| Terrain | Encounter rate per tile walked | Packs |
| --- | --- | --- |
| Grass | 10% | 1–2 slimes (50), slime + imp (25), 1–2 moths (25) |
| Forest | 15% | 1–2 imps (25), 2 moths (25), imp + moth (20), 1 dire wolf (15), 1 shade (15) |
| Path | 4% | 1 slime (100) |

**Biome: meadow**

| Parameter | Value |
| --- | --- |
| Map size | 48 × 48 tiles |
| Terrain mix | from seeded noise: height picks water / grass / mountain, a second noise layer places forest, paths connect spawn and miniboss |
| Miniboss distance from spawn | at least 20 tiles, reachable |
| Miniboss contact radius | 0.8 tiles |

### Balance targets

The first balance pass tunes the numbers above toward these:

| Target | Value |
| --- | --- |
| Run length | 10–15 minutes |
| Fights before the hero is ready for the miniboss | about 10 |
| Hero level when ready | about 5 |
| Regular fight length | 3–6 hero turns |
| `grinder` win rate against the miniboss at level 5 | about 70% |

The sim can't measure real minutes, so sweeps report an **estimated play time**: about 3 seconds per hero decision, 1.5 seconds per enemy action, 2 seconds per fight transition, plus distance walked divided by walk speed. Real play tests calibrate those constants.

**Assets**

| Pack | Loaded | Logical IDs |
| --- | --- | --- |
| `boot` | immediately | `ui.font.main`, `ui.loader.art` |
| `core` | after boot | `hero.strider.model`, `ui.window.frame` |
| `biome.meadow` | lazily, before entering the field | `terrain.{grass,forest,path,water,mountain}.texture`, `mob.{slime,ember_imp,frost_moth,dire_wolf,shade,rust_sentinel}.model`, `combat.backdrop.meadow` |

All art starts as placeholders: simple shapes plus pixel textures written by `tools/gen-placeholders.ts` into `assets/generated/` with sidecars. Putting the `biome.meadow` assets in their own lazy pack exercises lazy loading from day one.

## View

- **Renderer:** `WebGPURenderer` with automatic WebGL2 fallback. One render loop owned by the view.
- **Field scene:** terrain built from the map as merged low-poly tile columns with pixel textures; hero and miniboss as placeholder models of six blocks; the hero turns to face its movement; 3/4 camera that follows the hero smoothly. Positions interpolate between sim ticks.
- **Combat scene:** a simple meadow backdrop, hero on one side, enemies on the other.
- **Combat sequencer:** consumes sim events in order and plays each one (lunge, flash, damage number, defeat fade) with `await`, then tells the UI it's ready for input.
- **Lighting:** one sun and one sky light.

## UI

React DOM overlay over the canvas, NES-style bordered windows and a pixel font. A zustand store holds the latest snapshot and the pending events.

- Loader screen with progress.
- Field HUD: level, HP, MP.
- Combat: command window, spell and item submenus, target selection, enemy names and hero status, message log.
- Victory and game over screens showing run stats (play time, fights won and fled, level, damage dealt and taken, potions used, distance walked, seed, and on game over what killed you), with a restart option. Confirm is A or Enter. The sim counts everything except play time, which the UI clocks. `?combat=` plays that pack, then the same ending screen, and confirm starts a new seed.
- Pause, from Escape or Start. The screen titles itself Roguelike RPG, with the line "if dragon warrior was a procedural roguelike", and offers Resume, Restart, and Launcher. The field and the fight do not step while it is open, and that time is left off the play clock. The page does not keep a launcher link up.
- Menus are fully navigable with actions only.

## Input

| Action | Keyboard | Gamepad (standard mapping) |
| --- | --- | --- |
| Move (field) | arrow keys, WASD (eight directions) | left stick (analog, with a dead zone), d-pad |
| Menu up, down, left, right | arrow keys, WASD | d-pad, left stick |
| Confirm | Enter, Space, Z | A |
| Cancel | Backspace, X | B |
| Pause | Escape | Start |

The input layer turns devices into one quantized move vector per tick plus discrete menu actions. Default bindings only. Rebinding comes later. A key owns its axis, and the pad still moves the other one. A menu direction from the stick registers at half deflection, once, until the stick comes back. A diagonal keeps the stronger axis, and a tie moves the cursor. A direction already held when a menu opens does not count until it is released. Escape pauses instead of canceling a menu. Left and A still cancel.

## Harness

The headless CLI loads the bundle from disk, creates a sim, and lets a policy play.

```
npm run sim -- --seed 42 --policy grinder --out runs/42.json
npm run sim -- --policy grinder --runs 1000          # seed sweep, prints a summary
npm run sim -- --replay runs/42.json                 # replays and verifies the result matches
```

Policies:

| Policy | Plays |
| --- | --- |
| `random` | Random stick vectors held for random durations; random legal combat actions. Finds crashes and stuck spots. |
| `fighter` | Wanders the field; always Fight; potion below 30% HP. |
| `caster` | Wanders; casts the spell the target is weak to while MP lasts, then fights. |
| `grinder` | Wanders until a target level, then paths to the miniboss and fights it. |

Policies that walk somewhere plan a path on the tile grid (A*) and steer toward each waypoint with stick vectors, in batches of ticks so runs stay fast.

Run logs record the seed, bundle ID and version, every action, the outcome, and a hash of the event stream. Replay re-runs the actions and checks the hash.

Sweep summary: win rate, level when reaching the miniboss, fights per run, distance walked, estimated play time, deaths by mob, potions used.

## Tests

Unit (Vitest):

- Seeded RNG: same seed gives the same sequence.
- Turn queue: haste ratios give proportional turn counts; tie-breaking.
- Damage, crits, element multipliers, Defend.
- Flee chance and the miniboss no-flee rule.
- Movement: diagonals aren't faster, the hero can't enter blocked tiles, it slides along walls, the same inputs give the same position.
- Encounters: minimum distance between fights; rates per terrain; table weights over many rolls; a move batch stops at an encounter.
- Map generation: spawn and miniboss reachable on many seeds.
- Leveling and stat growth.
- Bundle validation: good bundle passes; broken references fail.
- Replay: a recorded run replays to the same event hash.

End-to-end (Playwright):

- Launcher links to prototype one; it boots and the loader completes.
- Holding an arrow key moves the hero.
- A forced encounter (through the dev-only `window.__game` hook) opens combat; Fight with keyboard defeats a weak enemy.
- Game over and victory screens show stats; restart works.

## Milestones

Each milestone is a series of small stages, one commit each, following the `staged-delivery` skill. The stage name is the commit summary. A stage is done when that commit is on the branch and its check (a test, a log line, the dev panel, or the running game) shows the change.

Each milestone merges as one squashed pull request. A finished milestone's heading shows `(done, hash)`, the squash commit on `main`. These milestones are the work items until they move to GitHub issues.

### 1. Tooling (done, b9889d5)

Merged in [#3](https://github.com/10kInteractive/roguelike_rpg/pull/3). The logger and the dev panel landed here so later stages have somewhere to show their output.

- `chore: add vite build tooling`
- `chore: add typescript with strict config`
- `chore: add biome lint and format`
- `chore: add launcher and prototype one entry`
- `feat: three.js canvas with backend log`
- `feat: react overlay on the prototype canvas`
- `feat: namespaced debug logger`
- `feat: dev panel toggled with backtick`
- `chore: add vitest and sim purity checks`
- `chore: run checks on pull requests`

### 2. Sim core (done, 1673805)

Merged in [#4](https://github.com/10kInteractive/roguelike_rpg/pull/4). Combat rules, then the data that feeds them. Tests are the check until the sim CLI exists.

- `feat: seeded rng`. The same seed produces the same sequence.
- `feat: haste turn queue`. A faster actor takes more turns. Ties go to haste, then the hero, then list order.
- `feat: fight action and damage`. A hero and one enemy trade hits until one reaches zero HP. The test lists every hit.
- `feat: critical hits`. A physical attack can roll the crit chance and deal ×1.5.
- `feat: ember and frost`. Fire and ice apply the weakness and resistance multipliers.
- `feat: defend`. Damage is halved until that actor's next turn.
- `feat: potions`. A potion heals and spends the turn.
- `feat: flee`. The chance follows haste. A miniboss fight cannot be fled.
- `feat: weighted enemy actions`. An enemy picks from its action list by weight.
- `feat: xp and level up`. A win grants XP. Enough XP raises level and grows stats. A defeat ends the fight.
- `feat: bundle schema`. A valid bundle loads. A broken reference fails.
- `feat: prototype one bundle`. Strider, the spells, the potion, the four mobs, and the meadow numbers.

### 3. Harness (done, 1e0cfe8)

Merged in [#5](https://github.com/10kInteractive/roguelike_rpg/pull/5). The CLI plays combat before anything walks. Field policies wait for the field sim.

- `feat: sim cli`. `npm run sim -- --seed 42` prints a fight's events.
- `feat: fighter policy`. Always Fight. Drink a potion below 30% HP.
- `feat: caster policy`. Cast the spell the target is weak to, then Fight when MP runs out.
- `feat: random policy`. Random legal combat actions, used to find crashes.
- `feat: replay`. The same seed and action list produce the same event hash.
- `feat: seed sweep`. Many seeds print one summary: win rate, fights, and deaths by mob.

### 4. Field sim (done, 1b465f2)

Merged in [#6](https://github.com/10kInteractive/roguelike_rpg/pull/6).

- `feat: meadow map`. Spawn and the miniboss are reachable on many seeds.
- `feat: field movement`. The same inputs end at the same position. Diagonals are not faster.
- `feat: tile collision`. The hero cannot enter a blocked tile and slides along its edge.
- `feat: encounters by distance`. Each terrain rolls at its rate. Fights stay a minimum distance apart. A move batch stops when a fight starts.
- `feat: miniboss contact`. Touching the miniboss starts a fight.
- `feat: run stats`. The sim counts fights, damage, potions, distance, and the seed.
- `feat: walking policies`. Fighter and caster wander. Grinder walks until the target level, then paths to the miniboss.
- `feat: field sweep`. A 1000-seed grinder run prints the balance summary, including estimated play time.

### 5. Housekeeping (done, 3ee277e, 492ccc3)

Merged in [#7](https://github.com/10kInteractive/roguelike_rpg/pull/7) and [#8](https://github.com/10kInteractive/roguelike_rpg/pull/8). Structure only, before the view builds on it. Every sweep and replay printed the same output before and after, except the noise fix at the end.

- `refactor: name sim values in game words`. Names and doc comments say what each value means in play.
- `refactor: seeded generator is a class`, then the turn queue, the fight, the encounter walk, run statistics, and the grinder run, one commit each.
- `refactor: policies are classes, controller helpers are private, rng moves to sim/utils`. Every class is in `{area}.controller.ts`.
- `refactor: harness moves out of the sim to src/harness`.
- `refactor: combat formulas move to combat/utils with sibling types`, then weighted picks to `sim/utils`.
- `refactor: map, movement, and harness types and constants move to sibling files`.
- `refactor: noise hash, formula renames, debug singletons, and README`.
- `fix: map noise blends east–west on both rows`. The second blend used the north–south weight, so noise jumped every eighth column. Every meadow changed. The 1000-run grinder sweep moved from a 0.735 win rate and 19.4 fights to 0.755 and 20.0.

### 6. View (done, d884fce)

On the `bozmak/view` branch, not merged yet. The canvas, the WebGPU renderer, and the React overlay already exist from tooling. Three refactors came up along the way: the bundle rules, the pack fight, and the page startup each had a second user, so each moved to one shared place. The sweep and replay output stayed identical through all three.

- `feat: fixed timestep`. The sim steps at 30 Hz. The view interpolates between the last two positions.
- `feat: placeholder textures`. Generated pixel textures, with a sidecar for each file.
- `feat: meadow field scene`. Tile columns, the hero, and the miniboss under a sun and a sky light. The hero turns to face movement.
- `feat: follow camera`. A 3/4 camera stays with the hero.
- `refactor: view directories`. `view/` splits into `field/`, `combat/`, and `art/`, which both scenes share.
- `feat: combat scene`. Hero on one side, enemies on the other, meadow backdrop.
- `refactor: bundle rule helpers`. Bundle rules into fight and level rules, known spells, and the mob table, in `src/content/rules.ts`.
- `refactor: pack fights out of the run`. `PackFightController` fights a pack mob by mob and carries the hero. The run and the view both use it.
- `feat: combat sequencer`. Events play in order (lunge, flash, damage number, defeat fade), then input unlocks.
- `refactor: game runtime controller`. `GameRuntimeController` reads the launch options and opens the field or a fight. The page only starts it.
- `feat: lazy meadow pack`. The loader shows progress. The field appears when the pack is ready. Production builds ship the asset files.

### 7. UI and input

- `feat: field encounters on screen`. The stand-in walk rolls encounters. A fight swaps to the combat scene, plays the pack, and returns to the field where the hero stood. Touching the miniboss starts its fight. A defeat ends the run with a status line until the game over screen exists. The run plays itself on the grinder's policies and generators, so a seed plays the same run on screen as in the sweep.
- `feat: sim api`. `createSim`, `observe`, `legalActions`, and `act` in `src/sim/index.ts`. One hero action in, every consequence out, so fights stop being resolved whole by a policy. The stand-in policy acts through `act()` until the command window replaces it. Three stages: `refactor: steppable fight` (the fight pauses at each hero turn), `feat: sim api`, and `refactor: stand-in plays through act()`.
- `feat: ui store`. A zustand store holds the latest snapshot and the events still waiting to play.
- `feat: field hud`. Level, HP, and MP.
- `feat: command window`. Fight, Magic, Item, Defend, Run, using keyboard actions only. The player drives the run by default. `?gameloop=ai` keeps the stand-in policies playing it.
- `feat: spell item and target menus`. Submenus for spells, potions, and which enemy.
- `feat: message log`. A line for each event, along the base of the view. It clears when the fight ends.
- `feat: victory and game over`. Run stats and a restart. Restart creates a new sim with a new seed.
- `feat: gamepad`. The same actions from a standard-mapping pad.

### 8. Polish

- `feat: boot end-to-end test`. The launcher opens prototype one and the loader finishes.
- `feat: walk and fight end-to-end test`. An arrow key moves the hero. A forced encounter ends when Fight beats a weak enemy.
- `feat: ending end-to-end test`. Victory and game over show stats, and restart works.
- `feat: authored assets win`. A file dropped in `assets/authored/` replaces the placeholder with the same id, with no code change.
- `feat: balance pass`. Tune the bundle numbers from the sweep toward the targets.

## Done when

- [ ] Prototype one runs locally with `npm run dev`, and the production build works with `npm run preview`.
- [ ] A full run is playable start to finish with keyboard or gamepad, in about 10–15 minutes.
- [x] `npm run check` passes and runs in CI.
- [x] A 1000-seed sweep with the `grinder` policy completes and reports a summary.
- [x] A recorded run replays to the same result.
- [ ] Replacing a placeholder by dropping a same-ID file into `assets/authored/` changes it in game with no code change.

## Open questions

- Do the balance targets feel right once we play it, especially the 70% win rate at level 5?
- Is 4 tiles per second the right walk speed for the map size?
