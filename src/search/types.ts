import type { DisplayPhoto } from "../corpus/place-photos";

export type ShortcutView = { id: string; label: string; bgColor: string; fgColor: string };

export type ShortcutSuggestions = { label: string; shortcuts: ShortcutView[] };

export type SearchResultPlace = {
  slug: string;
  name: string;
  commune: string;
  excerpt: string | null;
  cover: DisplayPhoto | null;
  tips: string[];
};

export type SearchResult =
  | { status: "ok"; title: string; intro: string; places: SearchResultPlace[] }
  | { status: "empty"; title: string; intro: string }
  | { status: "error" };
