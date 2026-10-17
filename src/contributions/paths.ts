export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || /[\\\u0000-\u001f]/.test(next)) return "/";
  try {
    const url = new URL(next, "http://x");
    if (url.origin !== "http://x") return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

export function withSentFlag(path: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}contribution=envoyee`;
}
