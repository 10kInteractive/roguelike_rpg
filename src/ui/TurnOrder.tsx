import { nameFromId } from "./names";
import { useUiSnapshot } from "./store.controller";

/** Who acts next, soonest first. Hidden while the hero is walking. */
export function TurnOrder() {
  const snapshot = useUiSnapshot();
  const order = snapshot?.mode === "combat" ? snapshot.combat?.turnOrder : undefined;
  if (!order || order.length === 0) return null;

  return <p className="turn-order">{order.map(nameFromId).join(" · ")}</p>;
}
