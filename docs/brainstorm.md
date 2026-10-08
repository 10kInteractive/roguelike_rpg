# Brainstorm

Raw notes feeding `docs/game_design.md`. Settled direction is marked. Open questions stay open.

## One-liner

A light sci-fi / fantasy blend in NES RPG clothes: one hero on a lush 3/4 procedural overworld, haste-order menu combat, pixel textures on simple 3D. You pick a loadout from your home stash and push three stages deeper into a zone. Each inn between stages asks the same question: push in or opt out. Extract and you keep everything you are carrying. Die and what you brought in is at risk. Hardcore first.

## Setting: light sci-fi / fantasy blend

- Swords and sorcery with a technological undercurrent everywhere, not a tech biome off to the side.
- **Vampire Hunter D** is the touchstone archetype: a cybernetically enhanced hunter with a blade and a gun.
- Tech belongs to **every class**: a warlock can wield a plasma staff, a fighter can carry a blaster sidearm.
- FF3 / FF6 machina energy for enemies and set pieces: mechs, ruins of old machines, augment shops.
- Bodies are part of the kit: augments are installed tech, trinkets are tech or elements attached to the body.

## Settled direction

### Hero on the field, room for a party in combat

- **One avatar on the overworld**, Final Fantasy 1 style: a single character stands in for whoever is actually in the fight.
- Combat can later grow **guest slots** (strangers, pets) as extra haste actors. They do not need their own field sprites.
- First playable: hero only in combat too. Data should not assume solo forever.

### Class and race

- v1 ships **one class: Strider**. General purpose, good general stats, nothing exceptional. The gear and boons make the build.
- **Races** are supported: human, reptilian, cybernetic, more later. Race is separate from class.
- Races are **art assets plus stat boosts**. They also **vary augment and trinket slot counts** (a cybernetic body might take more augments, fewer trinkets). Armor and weapon slots stay the same for everyone.
- More classes come later. Data should not assume one class.

### World: lush 3/4 overworld, not a flat sprite map

- Lean into **open-world grinding** like early Final Fantasy: roam, bump into fights, get stronger in *this* place.
- Camera is **3/4**. NES-RPG layout language on a **3D map**. Pixel / sprite-like textures. Simple 3D models for people and monsters.
- FF7 field feeling: walk the map, then a fight screen opens.
- **Procedural maps.** Close, lush detail. **Global illumination.** **Day / night.**
- Later: a **meta-map** with several biomes on one level.

### How fights start

- **Invisible random encounters** while walking (classic NES fog).
- **Visible miniboss packs** on the field that you can **walk around**. Engaging is a choice. Real risk, juicy loot table.
- Some packs are **repeatable farms** until a particular item drops. That is the grind valve: you *choose* to keep pulling the elite.

### Combat: overlay, menus, haste ticks

- Fight screen over a paused world. Biome-matched 3D backdrop. Command window is the hands.
- **Per-actor turns** from a **haste** stat. Interleaved, not team-then-team.
- Pure melee is valid. Special attacks and on-hit extras come from **boons**, not a giant baked skill list.

### Run structure: three stages deeper into a zone

- A run is **three stages**, each ending in a **stage boss**. Each stage is *deeper into the zone*: harder, richer.
- **Biomes are rolled across the stages.** They come and go; a stage is not tied to one biome. Depth sets difficulty, biome sets look and mob families.
- **Inn at each stage cusp.** Rest, recover health, **shop**. Boon reroll is undecided.
- **The inn is the extract point.** Every inn is a choice: **push in** to the next stage, or **opt out** and go home with your kit. Killing the final boss is the last extract.
- **Hardcore is the v1 mode.** Death ends the run and sends you back to town. A run is one session.
- Multi-session runs and in-run save are parked for later.
- Target for a ready, full clear is still ~40–60 minutes.

### Extraction: keep what you carry, lose what you risk

Arc Raiders is the reference. This gives the game notes of an extraction roguelike. Might work, might not. Start here.

- Before a run you pick a **loadout** from your **home stash**. Bring **whatever you are willing to risk**. No slot cap on the loadout.
- **Free loadout** is always available: a basic kit that costs nothing, so a bad death never locks you out of playing.
- Gear **drops eagerly** during the run. You equip it or carry it in the **backpack**.
- **Opt out at an inn or kill the final boss** and you go home with your **full kit**: everything equipped and in the backpack.
- Extracted gear goes into the home stash.
- **Die** and you lose everything except what sits in **anchored slots**.
- The tension: how much do you risk bringing in, and when do you cash out instead of going deeper?

#### Risk model: anchored slots plus durability

Arc Raiders has few slots, so losing a loadout stings but is quick to rebuild. World of Warcraft has many slots and never takes them away. We sit in the middle: ~16 slots is a lot of collected gear. Two mechanics keep it at risk without making one bad fight erase it all.

**Anchored slots (the Arc Raiders safe pocket):**

- A small number of slots are **anchored**. Whatever is in them **survives death**.
- Everything else (unanchored equipment and the backpack) is **lost on death**.
- Choosing what to anchor is a pre-run decision: your favorite blade, or the augment you can't replace.

**Durability (the slow erosion):**

- Gear **wears down in normal play**, not only on death.
- **Repair costs currency** at the inn shop or in town. It is a deliberate **currency sink**.
- If a piece **breaks in the field**, it becomes **unusable** until repaired, or is **lost outright**. Which one is still open.
- Even anchored gear wears out. Anchoring protects a piece from death, not from neglect.

Storage:

- **Equipped slots** — what the hero is wearing, wielding, and has installed.
- **Anchored slots** — a few protected slots. Survive death.
- **Backpack** — carried this run. Comes home on extract, lost on death.
- **Home stash** — starts at **20 slots**, can grow to hundreds.

### Equipment slots

| Group | Slots | Notes |
| --- | --- | --- |
| Armor | head, shoulders, chest, belt, legs, feet, wrists, gloves | 8 now, room for 10 |
| Weapon | main hand, off hand, ranged | 3 |
| Augment | 3 to start, more later | tech installed into the body; count varies by race |
| Trinket | 2 to start, more later | tech or element attached to the body; count varies by race |

Trinkets are now gear in slots, so they can be found, extracted, and lost like everything else. Overworld verbs like "find treasure" can be one kind of trinket effect.

### Powers: kit vs. run spice

You **collect gear to build the character**. You **augment with boons during the run**. Boons are not a second armor rack — they are skills, spells, effects, affixes.

- **The kit is the long-term character.** Building a full set across 16-ish slots is the RPG pleasure, and extraction makes it stick.
- **Boons** — regular cadence, this run only, **class-colored drafts**. Elemental bonuses, magic affixes, tech effects. Gone on death *and* on extract.
- **Spells / combat skills** — this run, often *as* boons. Weapons carry elements into melee.
- **Skill tree** (hub, persistent) — numeric spine: XP gain, Int bump, Str bump. Never lost.

### Magic wheel and tech

- **Tech is a material, not an element.** It is a weapon and augment family that can deal any element: a plasma staff deals fire, a cryo rifle deals ice, a blaster could be electric.
- The wheel is **4–5 elements**, strong into the next, weak to the previous. Working example: fire → ice → electricity → water → fire. A fifth element needs a name now that tech has left.
- Every class can roll tech gear and tech boons.

### Hub

- Central town / home base. Leave into instance runs that roll a bit differently each time.
- Home stash, loadout screen, skill tree live here.

### Look

- Pixelated materials on low-poly. NES-clear combat UI. World can still bloom.

## Loop sketch

1. Town. Pick race (and later class), spend on the tree, choose a loadout from the stash (or take the free one), repair gear.
2. Stage one: walk a procedural map. Random fog fights. Optional miniboss packs you can walk around or farm.
3. Combat overlay, haste turns, command window.
4. Eager gear drops: equip or backpack. Class-colored boon drafts on a cadence.
5. Stage boss. Inn at the cusp: rest, heal, shop, repair. Push in or opt out.
6. Stages two and three: deeper, harder, biomes reroll.
7. Opt out or kill the final boss: full kit goes home to the stash. Death: everything is lost except anchored slots.

## Layers of power (how they stack)

| Layer | When | Survives death? | Survives extract? | Job |
| --- | --- | --- | --- | --- |
| Race / class | hub | yes | yes | base stats, boon colors |
| Skill tree | hub spend | yes | yes | XP, Int, Str, other numbers |
| Home stash | extracted gear | yes | yes | the long-term collection |
| Anchored slots | picked before the run | yes | yes | what you protect |
| Loadout (unanchored) | picked from stash | no | yes | what you risk |
| Free loadout | always available | n/a | n/a | the safety net |
| Run drops | eager | no | yes | what you might win |
| Run boons | in-run drafts | no | no | this run's personality |
| Guests / pets | in-run, later | no | TBD | extra combat actors |

## Fantasy to protect

- Building a *set* across many slots, then blessing it with this run's drafts.
- The extraction itch: one more stage for better loot, or cash out at the inn?
- Walking around a miniboss pack and deciding if you are greedy.
- A cyborg hunter with a sword and a gun, in a world that still has slimes.
- The sting of losing a favorite piece, and the hunt to replace it.

## Prototype-sized slice (design, not stack)

- Strider, one race. One procedural map. Fog encounters plus one visible miniboss pack.
- Combat overlay, haste, command window, 1v1–3. Guest slot unused.
- Hardcore only. One stage with a boss and an inn to opt out at, or a three-stage stub with inns.
- Full slot model in data, but only a handful of slots need real items at first.
- Home stash of 20, free loadout plus loadout pick, opt out keeps everything.
- One anchored slot. Death loses everything else.
- Durability that wears in play, a repair cost, and a broken state.
- Class-colored boon drafts. One element pair (fire vs ice) plus one tech weapon.
- Town: stub tree (one Str or XP node).

## Still open (interview)

- **Broken in the field: unusable or lost?** Unusable-until-repaired is forgiving and still hurts mid-run. Lost outright is harsh and makes repair upkeep urgent.
- **How many anchored slots**, and can you earn more (skill tree node, trinket, race)?
- **Can anchored slots hold any item**, or only certain groups (e.g. one weapon or one augment)?
- **Boon reroll at the inn**: yes, no, or a shop item?
- **Backpack size**, and whether it forces choices in-run.
- **Fifth element name**, now that tech is a material. Earth, light, shadow, void, or something stranger?
- Haste UX: hidden ranks vs. visible ATB bar.
- Does day/night change encounter tables, or is it beauty + GI?
- Meta-map later: continent stitch vs. town portals.

## Steal / don't steal

Steal: DW / FF1 single field sprite, FF open grind, FF7 3/4 walk, NES menus, Hades-like boon *cadence* (class-colored), Arc Raiders loadout risk and extraction, FF3/6 mechs, Vampire Hunter D steel-and-laser, farmable field elites.

Don't steal: Hades dash combat, Dead Cells platforming, four walkers on the overworld, boons-as-armor that replace the gear fantasy, multi-session save complexity in v1, PvP extraction.

## Dump later

- Element names, mech / tech enemy family
- Status list, boon table, loot rarity tiers
- Economy: run gold vs. town currency
- Home stash expansion costs
- Race list and stat lines
- Guest rules
- Working title
