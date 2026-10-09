function debugSource(): string {
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

function enabledPatterns(source: string): RegExp[] {
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

const enabled = enabledPatterns(debugSource());

export function createLogger(namespace: string): (...args: unknown[]) => void {
  return (...args) => {
    if (!enabled.some((pattern) => pattern.test(namespace))) {
      return;
    }
    console.log(`[${namespace}]`, ...args);
  };
}
