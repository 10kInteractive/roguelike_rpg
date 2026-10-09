# Terrain generation

How prototype one builds its seeded meadow from five terrains: grass, forest, path, water, and mountain. The code is `src/sim/field/map.ts`, and the tuning numbers are in `src/sim/field/map.constants.ts`. The rules themselves are in `docs/game_design.md`. This file explains how the code produces them.

In short, the meadow comes from two layers of smooth random numbers, with a road painted over the top.

## 1. A grid of random heights

Every 8 tiles (`heightPeriod = 8`), at a point on a coarse grid, the seed is hashed into a number between 0 and 1. A 48×48 meadow has a 7×7 grid of these anchors. The hash is the same mulberry32 output that the seeded generator uses (`hashToUnit`), so a given seed and grid point always give the same value, in Node and in the browser.

```ts
/** One noise value at a lattice point. The same seed and point always match. */
function latticeValue(seed: number, x: number, y: number): number {
  const mixed = (seed ^ Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b)) >>> 0;
  return hashToUnit(mixed);
}
```

## 2. Smoothing between the anchors

A tile between anchors blends the four around it. It mixes east to west along the row above and the row below, then north to south between those two results. This is called value noise. Neighboring tiles get almost the same value, so the terrain forms broad areas instead of TV static.

```ts
export function sampleMeadowNoise(seed: number, x: number, y: number): number {
  const x0 = Math.floor(x / heightPeriod);
  const y0 = Math.floor(y / heightPeriod);
  const tx = (x % heightPeriod) / heightPeriod;
  const ty = (y % heightPeriod) / heightPeriod;
  const a = lerp(latticeValue(seed, x0, y0), latticeValue(seed, x0 + 1, y0), tx);
  const b = lerp(latticeValue(seed, x0, y0 + 1), latticeValue(seed, x0 + 1, y0 + 1), tx);
  return lerp(a, b, ty);
}
```

Both blends must use their own factor: `tx` across a row, `ty` between rows. An early version used the wrong factor in the second blend, so the noise only smoothed in one direction. The housekeeping milestone fixed it.

## 3. Thresholds turn heights into terrain

Each tile reads the height noise and a second, independent forest noise. The forest layer is the same function with a scrambled seed, `seed ^ 0x6d2b79f5`. Then four cutoffs pick the terrain:

```ts
function terrainAt(heightValue: number, forestValue: number): Terrain {
  if (heightValue < waterBelow) return "water";
  if (heightValue > mountainAbove) return "mountain";
  if (forestValue > forestAbove) return "forest";
  return "grass";
}
```

```
height:  0 ──── water ──── 0.38 ──────── land ──────── 0.70 ── mountain ── 1
                                           │
forest noise on land:          ≤ 0.55 grass  │  > 0.55 forest
```

Most of the look comes from those numbers:

- **Water covers a lot of the map.** The cutoff is 0.38, and blending pulls values toward the middle, so the low corners of the grid flood into lakes and rivers.
- **Mountains are rare.** Only tiles near a high anchor pass 0.7, so they show up as small ridges and peaks rather than ranges.
- **Forest only grows on land.** Because forest is a separate layer, it doesn't follow the coastline. Its patches cross lakes and ridges, which is why it reads as natural rather than as one more height band.
- **Straight edges and diamond shapes are artifacts.** They come from the simple bilinear blend on an 8-tile grid. They suit the pixel look, but a smoother curve or a second, finer layer of noise would make the shapes more organic.

## 4. Spawn, miniboss, and the road

- **Spawn:** a seeded generator picks a random walkable tile, meaning grass, forest, or path. If the noise put no walkable ground at all on the map, the center tile becomes grass.
- **Miniboss:** it picks a tile at least `minibossDistance` (20 in prototype one) tiles away from the spawn. On a map too small for that gap, it uses the farthest tile instead.
- **Road:** `layPath` paints an L-shaped road from the spawn to the miniboss, east or west first, then north or south. It overwrites whatever is underneath, so the miniboss is always reachable. That is why a road can run straight across a lake: those path tiles are a causeway through water.

The miniboss can be placed on water or a mountain. That's fine, because the road always ends on its tile and paints that tile as path.

## Why it is cheap and replayable

The steps run in a fixed order, and the result depends only on the seed and the size. There is no `Math.random`, and nothing reads the screen or the clock. That is why `?seed=42` in the browser gives the same meadow that the field sweep plays headlessly.

In the view, each terrain's column height in `src/view/field/scene.constants.ts` (water 0.3, path 0.55, grass 0.6, forest 0.85, mountain 1.8) turns those flat bands into the terraced 3D look.

## Tuning knobs

| Constant | Value | Effect of raising it |
| --- | --- | --- |
| `heightPeriod` | 8 | Broader lakes and ridges |
| `waterBelow` | 0.38 | More water |
| `mountainAbove` | 0.7 | Fewer mountains |
| `forestAbove` | 0.55 | Less forest |
| `minibossDistance` (bundle) | 20 | A longer walk to the miniboss |

Changing any of these changes every seed's meadow and the field sweep's baseline. Rerun `npm run sim -- --policy grinder --runs 1000` and record the new numbers in the same change.
