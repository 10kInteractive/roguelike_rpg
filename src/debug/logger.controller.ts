/**
 * Namespaced console logging, off unless asked for.
 *
 * `?debug=view,sim*` in the URL, or the same text in `localStorage.debug`,
 * turns namespaces on. `*` matches anything. The patterns are read once, when
 * the page loads.
 */
export class DebugLogController {
  /** Namespaces that print. */
  private readonly enabled: RegExp[];

  constructor() {
    this.enabled = this.parse(this.readSource());
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

  /** The URL's `debug` parameter wins over `localStorage.debug`. */
  private readSource(): string {
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
