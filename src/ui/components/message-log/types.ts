/** The lines on the log, ready to draw. Null when nothing has happened. */
export type MessageLogView = {
  /** Oldest line first, separated by newlines. */
  text: string;
};
