import type { MenuRow } from "../../commands";

/** The rows on screen, and which one the cursor is on. */
export type MenuFrame = {
  /** The rows of this menu. */
  rows: readonly MenuRow[];
  /** The cursor, as an index into `rows`. */
  index: number;
};

/** One row, ready to draw. */
export type CommandRowView = {
  /** Unique even when two rows share a label. */
  key: string;
  /** The words on the row. */
  label: string;
  /** `▸` when the cursor is here, otherwise a blank. */
  cursor: string;
  /** `command-row`, plus `selected` and `unavailable` when they apply. */
  className: string;
};

/** The open menu. Null while it is closed. */
export type CommandWindowView = {
  /** The rows of the open menu, top to bottom. */
  rows: readonly CommandRowView[];
};
