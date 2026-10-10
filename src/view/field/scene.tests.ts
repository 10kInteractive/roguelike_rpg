import { InstancedMesh, Matrix4, Vector3 } from "three";
import { expect, test } from "vitest";
import type { MeadowMap } from "../../sim/field/map.types";
import { fieldSkirtTiles } from "./scene.constants";
import { FieldSceneController } from "./scene.controller";

const meadow: MeadowMap = {
  width: 2,
  height: 2,
  tiles: ["grass", "water", "path", "mountain"],
  spawn: { x: 0, y: 0 },
  miniboss: { x: 1, y: 1 },
};

test("grass tiles surround the meadow, past every edge", () => {
  const scene = new FieldSceneController(meadow, {}, "mob.slime").scene;
  const skirt = scene.getObjectByName("tiles.skirt");
  const span = meadow.width + fieldSkirtTiles * 2;

  expect(skirt).toBeInstanceOf(InstancedMesh);
  if (!(skirt instanceof InstancedMesh)) return;
  expect(skirt.count).toBe(span * span - meadow.width * meadow.height);

  // The first tile is the southwest corner, south and west of the map.
  const place = new Matrix4();
  skirt.getMatrixAt(0, place);
  const corner = new Vector3().setFromMatrixPosition(place);
  expect(corner.x).toBeLessThan(0);
  expect(corner.z).toBeGreaterThan(0);
});
