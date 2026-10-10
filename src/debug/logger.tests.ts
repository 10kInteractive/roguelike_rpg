import { expect, test } from "vitest";
import { DebugLogController } from "./logger.controller";

test("an empty setting prints every namespace", () => {
  const lines = capture(() => {
    const log = new DebugLogController("").create("ui:log");
    log("Strider attacks");
  });
  expect(lines).toEqual([["[ui:log]", "Strider attacks"]]);
});

test("false prints nothing, and a list prints only its namespaces", () => {
  const silenced = capture(() => {
    new DebugLogController("false").create("ui:log")("Strider attacks");
  });
  expect(silenced).toEqual([]);

  const listed = capture(() => {
    const logs = new DebugLogController("view:field");
    logs.create("view:field")("hero holds");
    logs.create("ui:log")("Strider attacks");
  });
  expect(listed).toEqual([["[view:field]", "hero holds"]]);
});

/** The lines `console.log` received while `run` did its work. */
function capture(run: () => void): unknown[][] {
  const lines: unknown[][] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args);
  };
  try {
    run();
  } finally {
    console.log = original;
  }
  return lines;
}
