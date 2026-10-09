/** Resume keeps the run. Restart draws a new seed. Launcher leaves the prototype. */
export type PauseChoice = "resume" | "restart" | "launcher";

/** One row on the pause screen. */
export type PauseRowView = {
  /** Stable for the life of the screen. */
  key: string;
  /** The words on the row. */
  label: string;
  /** `▸` when the cursor is here, otherwise a blank. */
  cursor: string;
  /** Classes for the row. */
  className: string;
};

/** The pause screen, ready to draw. */
export type PauseView = {
  /** The name on the screen. */
  title: string;
  /** The line under the title. */
  subtitle: string;
  /** Resume, Restart, and Launcher. */
  rows: PauseRowView[];
};
