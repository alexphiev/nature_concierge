export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}

export function withSentFlag(path: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}contribution=envoyee`;
}
