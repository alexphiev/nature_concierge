import { TypeSafeClient, type NoulQuestion } from "@typesafe-ai/sdk";
import type { PlaceDoc, PlaceMatch, SearchAI, SearchAsk, ShortcutDoc, ShortcutMatch } from "../search-ai";
import { PLACE_FITS, REGION, ideaIsTimely, tipIsUseful } from "./questions";

export function createJevSearchAI(): SearchAI {
  // Lazy: the constructor throws without TYPESAFE_API_KEY, which would break builds.
  let client: TypeSafeClient | null = null;
  const getClient = () => (client ??= new TypeSafeClient());

  // One request per place (re-ranking pattern): small, focused state per call.
  async function rankPlace(ask: SearchAsk, place: PlaceDoc): Promise<PlaceMatch> {
    const questions: Record<string, NoulQuestion> = { fits: PLACE_FITS };
    place.tips.forEach((_, i) => {
      questions[`tip_${i}`] = tipIsUseful(i);
    });

    const { answers } = await getClient().systemOne({
      state: {
        request: { typed: ask.text, selected_needs: ask.needs },
        place: {
          name: place.name,
          commune: place.commune,
          type: place.type,
          description: place.description,
          tips: place.tips.map((tip) => tip.text),
        },
      },
      questions,
    });

    return {
      placeId: place.id,
      relevance: answers.fits.noul,
      tips: place.tips.map((tip, i) => ({ tipId: tip.id, relevance: answers[`tip_${i}`].noul })),
    };
  }

  return {
    rankPlaces(ask: SearchAsk, places: PlaceDoc[]): Promise<PlaceMatch[]> {
      return Promise.all(places.map((place) => rankPlace(ask, place)));
    },

    async rankShortcuts(momentDescription: string, shortcuts: ShortcutDoc[]): Promise<ShortcutMatch[]> {
      const keys = shortcuts.map((_, i) => `s${i}`);
      const { answers } = await getClient().systemOne({
        state: {
          region: REGION,
          moment: momentDescription,
          ideas: Object.fromEntries(shortcuts.map((shortcut, i) => [keys[i], shortcut.label])),
        },
        questions: Object.fromEntries(keys.map((key) => [key, ideaIsTimely(key)])) as Record<string, NoulQuestion>,
      });

      return shortcuts.map((shortcut, i) => ({ shortcutId: shortcut.id, relevance: answers[keys[i]].noul }));
    },
  };
}
