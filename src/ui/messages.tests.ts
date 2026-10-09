import { expect, test } from "vitest";
import type { SimEvent } from "../sim/game.types";
import { messageFor } from "./messages";

test("a hit, a spell, and a win each get a line", () => {
  const attacked: SimEvent = {
    type: "attacked",
    actorId: "mob.ember_imp",
    targetId: "hero.strider",
  };
  const hurt: SimEvent = {
    type: "damaged",
    actorId: "mob.ember_imp",
    targetId: "hero.strider",
    amount: 7,
    targetHp: 23,
    critical: false,
  };
  const cast: SimEvent = {
    type: "spellCast",
    actorId: "hero.strider",
    spellId: "spell.frost",
    targetId: "mob.ember_imp",
    mp: 7,
  };

  expect(messageFor(attacked)).toBe("Ember Imp attacks");
  expect(messageFor(hurt)).toBe("Strider takes 7");
  expect(messageFor({ ...hurt, critical: true })).toBe("Strider takes 7!");
  expect(messageFor(cast)).toBe("Strider casts Frost");
  expect(messageFor({ type: "combatEnded", outcome: "win" })).toBe("You win");
  expect(messageFor({ type: "turnStarted", actorId: "hero.strider" })).toBeNull();
});
