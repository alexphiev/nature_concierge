import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { prisma } from "../corpus/db";
import { getSearchCorpus, type SearchCorpusPlace } from "../corpus/queries";
import { resolveCoverPhoto } from "../corpus/place-photos";
import { getMoment } from "./moment";
import { searchAI } from "./provider";
import type { PlaceDoc, PlaceMatch, SearchAsk } from "./search-ai";
import type { SearchResult, SearchResultPlace, ShortcutSuggestions, ShortcutView } from "./types";

const SHORTCUTS_SHOWN = 4;
const MAX_RESULTS = 3;
const MIN_PLACE_RELEVANCE = 0.5;
const MAX_TIPS = 2;
const MIN_TIP_RELEVANCE = 0.5;
const EXCERPT_MAX = 160;

const OK_INTRO = "Voici les lieux qui correspondent le mieux à votre demande.";
const EMPTY_INTRO = "Je n’ai pas encore de conseil fiable pour cette demande.";

async function getActiveShortcuts(): Promise<ShortcutView[]> {
  "use cache";
  cacheTag("shortcuts");
  cacheLife("hours");
  return prisma.searchShortcut.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, label: true, bgColor: true, fgColor: true },
  });
}

// Throws on AI failure so the failure is never cached.
async function getSuggestedShortcuts(momentDescription: string): Promise<ShortcutView[]> {
  "use cache";
  cacheTag("shortcuts");
  cacheLife("hours");
  const shortcuts = await getActiveShortcuts();
  const matches = await searchAI.rankShortcuts(momentDescription, shortcuts);
  const relevance = new Map(matches.map((m) => [m.shortcutId, m.relevance]));
  // Array sort is stable, so ties keep the DB `order`.
  return [...shortcuts]
    .sort((a, b) => (relevance.get(b.id) ?? 0) - (relevance.get(a.id) ?? 0))
    .slice(0, SHORTCUTS_SHOWN);
}

export async function getShortcutsForNow(): Promise<ShortcutSuggestions> {
  await connection();
  const moment = getMoment(new Date());
  try {
    return { label: moment.label, shortcuts: await getSuggestedShortcuts(moment.description) };
  } catch (error) {
    console.error("Search: shortcut ranking failed, using default order", error);
    return { label: moment.label, shortcuts: (await getActiveShortcuts()).slice(0, SHORTCUTS_SHOWN) };
  }
}

function toPlaceDoc(place: SearchCorpusPlace): PlaceDoc {
  return {
    id: place.id,
    name: place.name,
    commune: place.commune,
    type: place.type,
    description: place.description,
    tips: place.claims.map((claim) => ({ id: claim.id, text: claim.claimText })),
  };
}

function excerpt(description: string | null): string | null {
  const text = description?.trim();
  if (!text) return null;
  const firstSentence = text.match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0] ?? text;
  if (firstSentence.length <= EXCERPT_MAX) return firstSentence;
  return `${firstSentence.slice(0, EXCERPT_MAX - 1).trimEnd()}…`;
}

async function toResultPlace(place: SearchCorpusPlace, match: PlaceMatch): Promise<SearchResultPlace> {
  const tipText = new Map(place.claims.map((claim) => [claim.id, claim.claimText]));
  const tips = match.tips
    .filter((tip) => tip.relevance >= MIN_TIP_RELEVANCE)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, MAX_TIPS)
    .map((tip) => tipText.get(tip.tipId))
    .filter((text): text is string => text !== undefined);

  return {
    slug: place.slug,
    name: place.name,
    commune: place.commune,
    excerpt: excerpt(place.description),
    cover: await resolveCoverPhoto(place),
    tips,
  };
}

export async function findPlaces(input: { text: string | null; shortcutIds: string[] }): Promise<SearchResult> {
  const [selected, corpus] = await Promise.all([
    prisma.searchShortcut.findMany({
      where: { id: { in: input.shortcutIds }, active: true },
      orderBy: { order: "asc" },
      select: { label: true, intro: true },
    }),
    getSearchCorpus(),
  ]);

  const ask: SearchAsk = { text: input.text, needs: selected.map((s) => s.label) };
  if (!ask.text && ask.needs.length === 0) return { status: "error" };

  let matches: PlaceMatch[];
  try {
    matches = await searchAI.rankPlaces(ask, corpus.map(toPlaceDoc));
  } catch (error) {
    console.error("Search: place ranking failed", error);
    return { status: "error" };
  }

  const title = ask.text ? [...ask.needs, ask.text].join(" · ") : ask.needs.join(" · ");
  const best = matches
    .filter((m) => m.relevance >= MIN_PLACE_RELEVANCE)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, MAX_RESULTS);
  if (best.length === 0) return { status: "empty", title, intro: EMPTY_INTRO };

  const byId = new Map(corpus.map((place) => [place.id, place]));
  const places = await Promise.all(
    best.flatMap((match) => {
      const place = byId.get(match.placeId);
      return place ? [toResultPlace(place, match)] : [];
    }),
  );
  const intro = selected.length === 1 && !ask.text ? selected[0].intro : OK_INTRO;
  return { status: "ok", title, intro, places };
}
