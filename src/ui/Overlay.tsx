import type { RuntimeStatus } from "../runtime/runtime.types";
import { CommandWindow } from "./CommandWindow";
import { FieldHud } from "./FieldHud";
import { MessageLog } from "./MessageLog";

/** The status line over the view, the hero's stats, and a progress bar while a pack loads. */
export function Overlay({ status }: { status: RuntimeStatus }) {
  return (
    <div className="hud">
      <p>{status.text}</p>
      {status.progress !== undefined && (
        <progress className="hud-progress" max={1} value={status.progress} />
      )}
      <FieldHud />
      <MessageLog />
      <CommandWindow />
    </div>
  );
}
