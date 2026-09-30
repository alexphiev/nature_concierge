// Provider-agnostic contract for the landing search. Adapters return raw
// relevance (0–1) for every input; sorting and thresholds are domain logic.

export type SearchAsk = { text: string | null; needs: string[] };

export type PlaceDoc = {
  id: string;
  name: string;
  commune: string;
  type: string;
  description: string | null;
  tips: { id: string; text: string }[];
};

export type PlaceMatch = {
  placeId: string;
  relevance: number;
  tips: { tipId: string; relevance: number }[];
};

export type ShortcutDoc = { id: string; label: string };

export type ShortcutMatch = { shortcutId: string; relevance: number };

export interface SearchAI {
  rankPlaces(ask: SearchAsk, places: PlaceDoc[]): Promise<PlaceMatch[]>;
  rankShortcuts(momentDescription: string, shortcuts: ShortcutDoc[]): Promise<ShortcutMatch[]>;
}
