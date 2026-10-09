import { expect, test } from "vitest";
import { TweenController } from "./tween.controller";

test("a tween steps through its progress and lands on exactly 1", () => {
  const tweens = new TweenController();
  const seen: number[] = [];
  void tweens.run(1, (progress) => seen.push(progress));
  tweens.advance(0.25);
  tweens.advance(0.5);
  tweens.advance(0.5);
  expect(seen).toEqual([0.25, 0.75, 1]);
  expect(tweens.count()).toBe(0);
});

test("the promise settles on the frame the tween finishes, not before", async () => {
  const tweens = new TweenController();
  let done = false;
  const finished = tweens.wait(0.5).then(() => {
    done = true;
  });
  tweens.advance(0.4);
  await Promise.resolve();
  expect(done).toBe(false);
  tweens.advance(0.2);
  await finished;
  expect(done).toBe(true);
});

test("a zero-length tween steps at 1 on the next frame", () => {
  const tweens = new TweenController();
  const seen: number[] = [];
  void tweens.run(0, (progress) => seen.push(progress));
  tweens.advance(0);
  expect(seen).toEqual([1]);
});
