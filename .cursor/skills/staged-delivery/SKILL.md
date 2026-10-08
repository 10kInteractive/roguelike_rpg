---
name: staged-delivery
description: Delivers work in small, testable stages, each with visible output (console logs, dev panel, CLI output, or a test) and its own commit. Use when implementing features, building prototype milestones, refactoring, or whenever the user asks to build, add, or change code in this project.
---

# Staged delivery

Josh prefers many small commits over big one-shots, and wants to see the effect of every change for himself. Work in **stages**.

## What a stage is

- One change Josh can **see and check in under a minute**.
- One commit.
- Leaves the project working: the dev server runs and existing checks pass.

If a stage can't be observed, it's either too small to stand alone (fold it into the next one) or it needs a log line, a dev panel entry, or a test that shows it.

## Workflow

Copy this checklist for each stage:

```
Stage: <one sentence>
- [ ] 1. State the stage and how Josh will see it
- [ ] 2. Make the smallest change that does it
- [ ] 3. Make it observable
- [ ] 4. Verify it yourself
- [ ] 5. Report and propose a commit message
- [ ] 6. Wait for Josh to commit before starting the next stage
```

**1. State it.** Before editing, say in one sentence what the stage does and exactly how Josh will see it ("Open the dev server with `?debug=sim:combat` and the console prints each turn").

**2. Smallest change.** No unrelated refactors, renames, or cleanups in the same stage. If one is needed, make it its own stage first.

**3. Make it observable.** Use the cheapest option that works:

| Change | Show it with |
| --- | --- |
| Sim rule (combat, field, RNG) | A unit test, plus events printed by the sim CLI |
| Browser behavior | A namespaced log line, or a value on the dev panel |
| Visual change | The dev server, plus a screenshot if the browser tool is available |
| Tooling or config | The command that proves it (`npm run check`, `npm run build`) |

Follow the logging and dev panel conventions in `docs/techstack.md` (section "Observability"). The sim never logs; log its events and snapshots at the boundary instead.

**4. Verify.** Run what applies: the relevant tests, `npm run check` once it exists, the sim CLI, and the dev server or browser. Read the output; don't assume. If something fails, fix it inside this stage or say so plainly.

**5. Report.** Keep it short:

- What changed (files, in a sentence or two).
- How to see it: the exact command, URL, debug namespace, or panel entry.
- What you ran and what it showed.
- A proposed commit message.

**6. Wait.** Josh creates branches and makes commits himself. Don't branch, commit, or push unless he asks. If he does ask, commit only this stage's files. Then move to the next stage when he says.

## Branches

- Josh works on one branch per milestone or topic and merges through pull requests.
- At the start of a milestone, suggest a branch name in the repo's style: `bozmak/<topic>` (for example `bozmak/tooling`, `bozmak/sim-core`).
- If the current branch doesn't look like the right home for the work (say, it's `main` or an unrelated topic), point that out before the first stage.

## Commit messages

Match the repo's existing style: `type: short summary`, lowercase.

- `feat:` new behavior
- `fix:` bug fix
- `chore:` tooling, config, docs housekeeping
- `test:` tests only
- `refactor:` no behavior change
- `docs:` documentation

Examples:

```
feat: seeded rng with sim cli output
test: haste turn queue ordering
chore: add biome and lint script
```

## Sizing examples

Too big: "Build the combat engine."

Right size, in order:

1. `feat: seeded rng` — test shows the same seed gives the same sequence.
2. `feat: haste turn queue` — test and CLI print the turn order for a hero and two mobs.
3. `feat: fight action and damage` — CLI prints a fight to the death, event by event.
4. `feat: ember and frost with element multipliers` — CLI shows weakness damage.

## Don't

- Bundle several stages into one change because they're "related".
- Leave a stage with no way to see it working.
- Remove a useful namespaced log just to tidy up. It stays off unless enabled.
- Branch, commit, push, or start the next stage without Josh's go-ahead.
