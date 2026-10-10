import type { RuntimeStatus } from "../../../runtime/runtime.types";
import { CommandWindow } from "../command-window/markup";
import { FieldHud } from "../field-hud/markup";
import { MessageLog } from "../message-log/markup";
import { PauseScreen } from "../pause/markup";
import { RunEndScreen } from "../run-end/markup";
import { VeilScreen } from "../veil/markup";
import { useOverlay } from "./controller";
import "./styles.css";

/** The status line over the view, the hero's stats, and a progress bar while a pack loads. */
export function Overlay({ status }: { status: RuntimeStatus }) {
  const view = useOverlay();
  return (
    <div className="hud">
      <p>{status.text}</p>
      {status.progress !== undefined && (
        <progress className="hud-progress" max={1} value={status.progress} />
      )}
      {view.ended ? (
        <RunEndScreen />
      ) : (
        <>
          <FieldHud />
          <MessageLog />
          <CommandWindow />
        </>
      )}
      <PauseScreen />
      <VeilScreen />
    </div>
  );
}
