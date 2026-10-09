---
name: readable-code
description: >-
  Keeps TypeScript readable as methods grow: grouping, activity comments, and
  JSDoc. Use when writing or editing code in this project, especially src/sim,
  and when the user mentions readability, comments, JSDoc, or grouping.
---

# Readable code

Logic lives in controller classes. Follow `.cursor/skills/controller-classes/SKILL.md` for when to write a class, when a loose helper is allowed, and how files are named. This skill covers readability inside those classes.

## Inside a procedure

- Separate grouped logic with a blank line.
- Put a comment immediately above the group. The comment describes the activity, in the game's words.
- Leave a line uncommented when the code already says the same thing.
- Keep the edit to readability. Do not change behavior, public types, or control flow in the same pass.

## Comments

```ts
// The haste queue names the actor, and their guard ends as the turn starts.
const actorId = queue.act();
const actor = actorId === hero.id ? hero : enemy;
defending.delete(actor.id);

// Pay for the spell and resolve it now. An unpaid spell falls through to Fight.
if (picked.type === "spell" && actor.mp >= picked.cost) {
```

A comment that restates the syntax does not help:

```ts
// Delete the id from the set.
defending.delete(actor.id);
```

## JSDoc

Every new function, type, and member gets a JSDoc comment. Say what it means in the game. Do not restate the signature.

```ts
/** Tile the miniboss occupies. The circle is centered in that tile. */
tile: TilePoint;
```

Backfilling older declarations is its own cleanup, not part of a feature stage.

## When a method grows

Split a long method into private methods named for the activity. Inside one method, blank lines and activity comments are the way to grow the procedure.
