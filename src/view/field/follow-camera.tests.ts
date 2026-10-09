import { PerspectiveCamera, Vector3 } from "three";
import { expect, test } from "vitest";
import { followOffset } from "./follow-camera.constants";
import { FollowCameraController } from "./follow-camera.controller";

test("snapping puts the camera up and south of the target", () => {
  const camera = new PerspectiveCamera();
  new FollowCameraController(camera).snapTo({ x: 10, y: 1, z: -20 });
  expect(camera.position.x).toBe(10);
  expect(camera.position.y).toBe(1 + followOffset.up);
  expect(camera.position.z).toBe(-20 + followOffset.south);
});

test("following closes part of the gap, never overshooting", () => {
  const follow = new FollowCameraController(new PerspectiveCamera());
  follow.snapTo({ x: 0, y: 0, z: 0 });
  follow.follow({ x: 10, y: 0, z: 0 }, 0.1);
  const aim = follow.aimPoint();
  expect(aim.x).toBeGreaterThan(0);
  expect(aim.x).toBeLessThan(10);
});

test("two half frames land where one whole frame does", () => {
  const target = new Vector3(6, 2, -4);
  const whole = new FollowCameraController(new PerspectiveCamera());
  const halves = new FollowCameraController(new PerspectiveCamera());
  whole.snapTo({ x: 0, y: 0, z: 0 });
  halves.snapTo({ x: 0, y: 0, z: 0 });

  whole.follow(target, 1 / 30);
  halves.follow(target, 1 / 60);
  halves.follow(target, 1 / 60);

  const a = whole.aimPoint();
  const b = halves.aimPoint();
  expect(b.x).toBeCloseTo(a.x, 10);
  expect(b.y).toBeCloseTo(a.y, 10);
  expect(b.z).toBeCloseTo(a.z, 10);
});
