export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const SITE_NAME = "Nature Concierge";

// Next shallow-merges `openGraph` across metadata objects: a page-level
// `openGraph` replaces the root layout's entirely, dropping siteName/locale
// unless the page spreads this back in.
export const BASE_OPEN_GRAPH = {
  siteName: SITE_NAME,
  locale: "fr_FR",
  type: "website",
} as const;
