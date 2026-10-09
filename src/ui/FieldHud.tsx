import { useUiSnapshot } from "./store.controller";

/** Level, HP, and MP from the latest snapshot. Hidden until a run has started. */
export function FieldHud() {
  const snapshot = useUiSnapshot();
  if (!snapshot) return null;

  const { level, hp, maxHp, mp, maxMp } = snapshot.hero;
  return (
    <p className="hud-stats">
      LV {level} · HP {hp}/{maxHp} · MP {mp}/{maxMp}
    </p>
  );
}
