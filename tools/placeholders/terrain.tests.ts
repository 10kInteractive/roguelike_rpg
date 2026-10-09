import { expect, test } from "vitest";
import { terrainRecipes, terrainTextureSize } from "./terrain.constants.ts";
import { TerrainTexturePainter } from "./terrain.controller.ts";

function colorsOf(recipeIndex: number): Set<string> {
  const recipe = terrainRecipes[recipeIndex];
  if (!recipe) throw new Error("no recipe");
  const image = new TerrainTexturePainter(recipe, terrainTextureSize).paint();
  const colors = new Set<string>();
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) colors.add(image.get(x, y).join(","));
  }
  return colors;
}

test("the same recipe paints the same file", () => {
  for (const recipe of terrainRecipes) {
    const once = new TerrainTexturePainter(recipe, terrainTextureSize).paint().toPng();
    const twice = new TerrainTexturePainter(recipe, terrainTextureSize).paint().toPng();
    expect(twice).toEqual(once);
  }
});

test("every pixel is a palette or streak color", () => {
  terrainRecipes.forEach((recipe, index) => {
    const allowed = new Set(recipe.palette.map((entry) => entry.color.join(",")));
    if (recipe.streaks) allowed.add(recipe.streaks.color.join(","));
    for (const color of colorsOf(index)) expect(allowed.has(color)).toBe(true);
  });
});
