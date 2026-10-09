# roguelike_rpg

If Final Fantasy and Dragon Warrior were a procedural roguelike.

Prototype one proves the core loop in the browser: a seeded meadow to walk, random encounters, haste-ordered turn combat with a fire and ice choice, leveling, and a miniboss you can avoid until you are ready. The build spec is `docs/prototypes/one.plan.md`.

## Where to look

| Folder | What it is | Decides outcomes? |
| --- | --- | --- |
| `prototypes/one/bundle` | Content: the hero, mobs, spells, items, encounter tables, and every tuning number. | No. The sim reads it. |
| `src/content` | Zod schemas, bundle loading, and bundle rows turned into fighters. | No. |
| `src/sim` | The game rules. Pure and seeded: no DOM, Three.js, React, or `Math.random`. | Yes. Only this folder. |
| `src/harness` | Headless play of the sim: replay, combat sweeps, grinder field sweeps. | No. It drives the sim. |
| `src/view`, `src/ui` | The Three.js scene and the React overlay. They render and animate what the sim decided. | No. |
| `src/debug` | The namespaced logger and the dev panel. | No. |
| `tools` | The sim CLI, the content check, and the purity check. | No. |

Mechanics live in `docs/game_design.md`. Stack and layout live in `docs/techstack.md`.

## File convention

- `{area}.controller.ts`: a class. Logic that keeps state between calls is a controller.
- `{area}.ts`: rule formulas and shared helpers.
- `{area}.types.ts`, `{area}.constants.ts`, `{area}.tests.ts`: that area's types, tuning numbers, and tests.

## Commands

```sh
npm run dev      # the prototype in the browser
npm run check    # typecheck, Biome, tests, sim purity, content check
npm run sim -- --seed 42 --policy caster --enemy mob.ember_imp
```

More sim commands, including sweeps and replays, are in `tools/sim-commands.txt`.
