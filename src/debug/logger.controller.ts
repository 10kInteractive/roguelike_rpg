/**
 * Namespaced console logging.
 *
 * On for every namespace unless the page says otherwise. `?debug=false`, or
 * `localStorage.debug` set to `false`, turns it off. A list such as
 * `?debug=view:field` prints only those namespaces. `*` matches anything.
 * The URL wins over localStorage. The choice is read once, when this is built.
 */
export class DebugLogController {
  /** Namespaces that print. Empty when logging is off. */
  private readonly enabled: RegExp[];

  /** @param source The debug setting. Omit it to read the page. */
  constructor(source?: string) {
    this.enabled = this.parse(this.normalize(source ?? this.readSource()));
  }

  /** A log function for one namespace. It prints only when that namespace is on. */
  create(namespace: string): (...args: unknown[]) => void {
    return (...args) => {
      if (!this.enabled.some((pattern) => pattern.test(namespace))) {
        return;
      }
      console.log(`[${namespace}]`, ...args);
    };
  }

  /** The URL's `debug` parameter wins over `localStorage.debug`. No page means off. */
  private readSource(): string {
    if (typeof window === "undefined") return "false";
    const params = new URLSearchParams(window.location.search);
    if (params.has("debug")) {
      return params.get("debug") ?? "";
    }
    try {
      return window.localStorage.getItem("debug") ?? "";
    } catch {
      return "";
    }
  }

  /** `false` prints nothing. An empty setting prints every namespace. */
  private normalize(source: string): string {
    const chosen = source.trim();
    if (chosen === "false") return "";
    if (chosen === "") return "*";
    return chosen;
  }

  /** Comma-separated names, where `*` matches anything. */
  private parse(source: string): RegExp[] {
    const patterns: RegExp[] = [];
    for (const part of source.split(",")) {
      const token = part.trim();
      if (token.length === 0) {
        continue;
      }
      const body = token.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
      patterns.push(new RegExp(`^${body}$`));
    }
    return patterns;
  }
}

/** The page's one logger. */
export const debugLog = new DebugLogController();
