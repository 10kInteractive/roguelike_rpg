import { expect, test } from "vitest";
import { PauseController } from "./controller";

test("pause opens on Resume, and confirm closes it", () => {
  const screen = new PauseController();
  expect(screen.view()).toBeNull();

  screen.toggle();
  const open = screen.view();
  expect(open?.title).toBe("Roguelike RPG");
  expect(open?.subtitle).toBe("if dragon warrior was a procedural roguelike");
  expect(open?.rows.map((row) => row.label)).toEqual(["Resume", "Restart", "Launcher"]);
  expect(open?.rows[0]?.cursor).toBe("▸");

  screen.apply("confirm");
  expect(screen.isOpen()).toBe(false);
});

test("Restart tells the run, and a choice that arrives first still counts", () => {
  const screen = new PauseController();
  let restarts = 0;
  const stop = screen.onRestart(() => {
    restarts += 1;
  });

  screen.toggle();
  screen.apply("down");
  screen.apply("confirm");
  expect(restarts).toBe(1);
  expect(screen.isOpen()).toBe(false);
  stop();

  const early = new PauseController();
  early.toggle();
  early.apply("down");
  early.apply("confirm");
  let hits = 0;
  early.onRestart(() => {
    hits += 1;
  });
  expect(hits).toBe(1);
});

test("a restart interrupts the walk", async () => {
  const screen = new PauseController();
  let release = () => {};
  const walk = new Promise<string>((resolve) => {
    release = () => resolve("fight");
  });
  const raced = screen.race(walk);

  screen.toggle();
  screen.apply("down");
  screen.apply("confirm");
  expect(await raced).toBeNull();

  release();
  await walk;
});
