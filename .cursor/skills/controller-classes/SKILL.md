---
name: controller-classes
description: >-
  Makes controller classes the default structure for logic in this project,
  and limits when a loose helper function is allowed. Use when writing,
  moving, or reviewing functions and classes, adding a module under src/,
  deciding between a function and a method, naming files, or when the user
  mentions controllers, classes, helpers, structure, or architecture.
---

# Controller classes

Josh prizes code structure and clean architecture. Logic lives in classes. A loose function is the exception, and it has to earn its place.

## The litmus: does this logic need state?

State decides class or no class. State means values that change between calls and that the next call depends on: a generator's position in its sequence, who is waiting in the turn queue, where the hero is standing.

- Needs state: a class instance that owns it.
- Needs no state: a private method of the class that uses it, or a shared helper when more than one class does.
- Built fresh, used once, and thrown away: that is not state. Write a function.

## Singletons

A singleton is right when the game has exactly one owner of something for the life of the page: the logger, the dev panel, the renderer, the input reader.

The controller file exports the class and its one instance, so tests can still build a fresh one: `export const debugWatches = new DebugWatchController();`.

`src/sim` has no singletons. A run uses three generators, a sweep plays a thousand seeds, and a replay starts fresh. Shared instance state there breaks determinism.

## The default: a class

- A process that keeps state between calls is a controller. It owns that state as private fields, and callers construct it and then ask it to advance: `new OneOnOneFightController(input).resolve()`, `encounter.holdStick(stick, ticks)`.
- Choices that share fixed inputs are a policy class. Build it once with what does not change, and call a method per choice: `new FieldWalkPolicy({ field, miniboss, rng }).chooseGrinder(position, level)`.
- Helpers that exist for one class are private methods on that class, even when they do not read `this`.
- The class name is the noun and says what it is. Methods are short verbs, because the class already names the thing they act on.
- Biome rejects a class with only static methods. Give it the inputs it shares as fields instead.

## When a loose helper is acceptable

A function may sit outside a class only when both are true:

- It does not need class or local state. It has no `this` references.
- It is used by more than one class, as a shared code helper.

If either is false, it is a private method. When a second class starts needing a private method, move it out to `{area}.ts` at that point, and not before.

Rule formulas are the one exception. Damage, flee chance, leveling, and movement stay in their own tested `{area}.ts` files even with one caller, because their tests pin the numbers in `docs/game_design.md`. A new formula joins them when it is a game rule with its own test. A helper that only tidies a controller is still a private method.

A UI component is four files under `src/ui/components/<name>/`:

- `controller.ts` holds the class. Input, menu state, and the view model live here.
- `markup.tsx` is JSX only. It asks the controller what to show and renders that. No key handlers, no game rules, no class-name building.
- `styles.css` is that component's rules.
- `types.ts` is the view model the markup receives.

A hook in the controller file is the bridge React needs. The dev panel in `src/debug` is still plain JSX. `Error` subclasses sit beside the code that throws them.

## Folders for shared code

- `src/sim/utils/`: used by more than one sim area. The seeded generator and weighted picks.
- `src/sim/combat/utils/`: combat rule formulas.
- `src/view/art/`: used by more than one scene. Placeholder models, lighting, terrain textures. It is named for what it holds instead of `utils/`.

Add a `utils/` folder when shared code appears, and record it in the layout in `docs/techstack.md`.

## Files

| File | Holds |
| --- | --- |
| `{area}.controller.ts` | Every class: a controller, a policy, the generator, the turn queue. |
| `{area}.ts` | Shared helpers that pass both tests above, and rule formulas. |
| `{area}.types.ts` | Exported types and their member comments. |
| `{area}.constants.ts` | Tuning numbers and fixed tables for that area. |
| `{area}.tests.ts` | Tests for that area. |

Area names are kebab-case and leave out the folder name, so the field walk policy is `src/sim/field/policy.controller.ts`. Import types from `.types.ts`, not through a controller.

## Boundaries that still hold

- `src/sim` stays pure and seeded. A controller there takes its `Rng` in the constructor and never touches the DOM, Three.js, React, or `Math.random`.
- A sim controller returns events or results. It does not log. The boundary prints.
- Do not add a base class, an interface, or a dependency-injection layer until two controllers need the same shape.

## Before you finish

- [ ] Every new function is a method, unless it passes both helper tests.
- [ ] Each private field and method has a JSDoc in game words.
- [ ] File names follow the table.
- [ ] `npm run check` passes.
