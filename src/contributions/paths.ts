export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || /[\\\u0000-\u001f]/.test(next)) return "/";
  try {
    const url = new URL(next, "http://x");
    if (url.origin !== "http://x") return "/";
    const result = url.pathname + url.search + url.hash;
    return result.startsWith("//") || result.startsWith("/\\") ? "/" : result;
  } catch {
    return "/";
  }
}

export function withSentFlag(path: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}contribution=envoyee`;
}
