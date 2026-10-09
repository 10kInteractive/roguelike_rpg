import type { RuntimeStatus } from "../runtime/runtime.types";
import { CommandWindow } from "./components/CommandWindow";
import { FieldHud } from "./components/FieldHud";
import { MessageLog } from "./components/MessageLog";
import { RunEndScreen } from "./components/RunEndScreen";
import { useUiSnapshot } from "./store.controller";

/** The status line over the view, the hero's stats, and a progress bar while a pack loads. */
export function Overlay({ status }: { status: RuntimeStatus }) {
  const mode = useUiSnapshot()?.mode;
  const ended = mode === "victory" || mode === "gameOver";
  return (
    <div className="hud">
      <p>{status.text}</p>
      {status.progress !== undefined && (
        <progress className="hud-progress" max={1} value={status.progress} />
      )}
      {ended ? (
        <RunEndScreen />
      ) : (
        <>
          <FieldHud />
          <MessageLog />
          <CommandWindow />
        </>
      )}
    </div>
  );
}
