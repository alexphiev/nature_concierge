# Landing Search with Jev — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the landing `SearchHero` real: Jev (TypeSafe) picks 4 of 20 DB shortcuts for the current moment, and ranks places + their tips for the user's shortcuts/text.

**Architecture:** A task-level `SearchAI` port (`src/search/search-ai.ts`) with one Jev adapter; domain logic (thresholds, top-N, DTOs) in `src/search/search-service.ts`; a server action for search; shortcut suggestions cached per moment and streamed into the client hero via a promise + `use()`.

**Tech Stack:** Next.js 16.2 (App Router, `cacheComponents: true`), React 19.2, Prisma 7 (Postgres/Neon), zod 4, `@typesafe-ai/sdk` 0.6.

**Spec:** `docs/superpowers/specs/2026-09-30-jev-search-design.md`

## Global Constraints

- Only `src/search/jev/*` may import `@typesafe-ai/sdk`. Everything else talks to `SearchAI` via `src/search/provider.ts`.
- Jev question instructions/criteria in English, all in `src/search/jev/questions.ts`. Place data sent as-is (French).
- Thresholds: `SHORTCUTS_SHOWN = 4`, `MAX_RESULTS = 3`, `MIN_PLACE_RELEVANCE = 0.5`, `MAX_TIPS = 2`, `MIN_TIP_RELEVANCE = 0.5`, `EXCERPT_MAX = 160`.
- Search input: `text` ≤ 300 chars, `shortcutIds` ≤ 20 entries, at least one of them non-empty.
- Tips = claims with `isPublic: true, status: "PUBLISHED"`, all claim types.
- User-facing copy is French; use typographic apostrophes (`’`) like the existing landing copy.
- No new automated tests (project convention). `pnpm test` must stay green.
- Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (this Next version differs from training data): `01-app/01-getting-started/08-caching.md` (Tasks 3–4), `01-app/02-guides/server-actions.md` (Task 3).
- Comments only for non-obvious logic.

## Review Focus

1. **Missing `TYPESAFE_API_KEY` at build time** — `new TypeSafeClient()` throws without a key; the client must be created lazily so `pnpm build` and page render never crash. Pinned in Task 2 (lazy `getClient`) and verified in Task 5 step 2.
2. **Jev down / slow** — shortcuts must fall back to the first 4 by `order` (and the failure must not be cached); search must show the error block, not crash. Pinned in Task 3 (`try/catch` outside the cached fn) and Task 5 manual step 6.
3. **Out-of-order responses** — user toggles badges quickly; an older slower response must not overwrite a newer one. Pinned in Task 4 (`latestRequest` ref).
4. **Place with zero tips / null description** — Jev request must still be valid (only `fits` question), excerpt `null`, card renders without tips. Pinned in Task 2 (questions built from `tips`) and Task 3 (`excerpt(null)`).
5. **Inactive or unknown shortcut ids with no text** — must return `{ status: "error" }`, not send an empty ask to Jev. Pinned in Task 3 (`findPlaces` guard).

---

### Task 1: `SearchShortcut` model, migration and seed

**Files:**
- Modify: `prisma/schema.prisma` (append model at end of file)
- Create: `prisma/migrations/<timestamp>_search_shortcuts/migration.sql` (generated)
- Create: `scripts/search/seed-shortcuts.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: Prisma model `SearchShortcut { id, label (unique), intro, bgColor, fgColor, order, active }`, accessed as `prisma.searchShortcut`. Script `pnpm search:seed`.

- [ ] **Step 0: Create the feature branch and commit the spec/plan**

```bash
git checkout -b feat/jev-search
git add docs/superpowers/specs/2026-09-30-jev-search-design.md docs/superpowers/plans/2026-09-30-jev-search.md
git commit -m "docs: spec and plan for Jev-powered landing search"
```

- [ ] **Step 1: Add the model to `prisma/schema.prisma`** (append at the end of the file)

```prisma

// ---------- Landing search ----------

model SearchShortcut {
  id      String  @id @default(cuid())
  label   String  @unique
  intro   String
  bgColor String
  fgColor String
  order   Int     @default(0)
  active  Boolean @default(true)
}
```

- [ ] **Step 2: Generate and apply the migration**

Run: `pnpm prisma migrate dev --name search_shortcuts`
Expected: new folder `prisma/migrations/<timestamp>_search_shortcuts/` with a `CREATE TABLE "SearchShortcut"` and a unique index on `label`; client regenerated.

- [ ] **Step 3: Create `scripts/search/seed-shortcuts.ts`**

```ts
import { prisma } from "../../src/corpus/db";

const PALETTES = [
  { bgColor: "#F6D98B", fgColor: "#4A3A0A" },
  { bgColor: "#A9DCD3", fgColor: "#0B3A44" },
  { bgColor: "#F6B39A", fgColor: "#5A1E10" },
  { bgColor: "#C9E0A8", fgColor: "#2A4318" },
];

const SHORTCUTS: { label: string; intro: string }[] = [
  { label: "Avec de jeunes enfants", intro: "Des lieux courts d’accès, avec de l’ombre et une entrée dans l’eau facile." },
  { label: "Première fois à La Ciotat", intro: "Pour comprendre le coin en une journée : la roche rouge, la mer et la vue sur le Bec de l’Aigle." },
  { label: "Coucher de soleil", intro: "Les endroits où la lumière du soir vaut le détour." },
  { label: "Avec un chien", intro: "Les lieux où votre chien est le bienvenu." },
  { label: "Sans voiture", intro: "Accessibles à pied, en bus ou en navette." },
  { label: "Baignade au calme", intro: "Des criques abritées pour nager tranquillement." },
  { label: "Snorkeling", intro: "Une eau claire et des fonds rocheux pour mettre la tête sous l’eau." },
  { label: "Petite balade (moins de 2 h)", intro: "Une sortie courte, faisable sans préparation." },
  { label: "Belle randonnée", intro: "Pour marcher plusieurs heures, avec de la vue en récompense." },
  { label: "Pique-nique", intro: "De la place, de l’ombre et une belle vue pour poser la nappe." },
  { label: "Loin de la foule", intro: "Des coins moins connus, où l’on respire." },
  { label: "Un jour de mistral", intro: "Des lieux abrités quand le vent souffle fort." },
  { label: "Tôt le matin", intro: "Pour profiter du calme et de la fraîcheur avant tout le monde." },
  { label: "Par forte chaleur", intro: "De l’ombre, de l’eau et des accès courts." },
  { label: "Vue sur la mer", intro: "Les panoramas qui valent la montée." },
  { label: "Criques et calanques", intro: "Les criques et calanques du coin, de la plus simple à la plus sauvage." },
  { label: "Accessible en poussette", intro: "Des chemins roulants, sans marches ni rochers." },
  { label: "Balade tranquille pour seniors", intro: "Des sorties sans dénivelé, avec de l’ombre pour souffler." },
  { label: "Observer la faune et la flore", intro: "Pour ouvrir l’œil : oiseaux, plantes du littoral et vie sous-marine." },
  { label: "Sortie hors saison", intro: "Des lieux qui gardent leur charme quand la saison est finie." },
];

async function main() {
  for (const [index, shortcut] of SHORTCUTS.entries()) {
    const data = { ...shortcut, ...PALETTES[index % PALETTES.length], order: index };
    await prisma.searchShortcut.upsert({
      where: { label: shortcut.label },
      create: data,
      update: data,
    });
  }
  console.log(`search:seed — ${SHORTCUTS.length} shortcuts upserted`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
```

- [ ] **Step 4: Add the script to `package.json`** (after `"corpus:stats"`)

```json
    "search:seed": "tsx scripts/search/seed-shortcuts.ts",
```

- [ ] **Step 5: Run the seed**

Run: `pnpm search:seed`
Expected: `search:seed — 20 shortcuts upserted`. Running it a second time prints the same line (idempotent).

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit && pnpm test`
Expected: no type errors, all tests pass.

```bash
git add prisma/schema.prisma prisma/migrations scripts/search/seed-shortcuts.ts package.json
git commit -m "feat(search): add SearchShortcut model and seed of 20 shortcuts"
```

---

### Task 2: AI layer — port, moment, Jev adapter, provider

**Files:**
- Create: `src/search/search-ai.ts`
- Create: `src/search/moment.ts`
- Create: `src/search/jev/questions.ts`
- Create: `src/search/jev/jev-search-ai.ts`
- Create: `src/search/provider.ts`
- Modify: `package.json` / `pnpm-lock.yaml` (dependency)
- Modify: `.env.dist`

**Interfaces:**
- Produces (used by Task 3):
  - `type SearchAsk = { text: string | null; needs: string[] }`
  - `type PlaceDoc = { id; name; commune; type; description: string | null; tips: { id: string; text: string }[] }`
  - `type PlaceMatch = { placeId: string; relevance: number; tips: { tipId: string; relevance: number }[] }`
  - `type ShortcutDoc = { id: string; label: string }`, `type ShortcutMatch = { shortcutId: string; relevance: number }`
  - `interface SearchAI { rankPlaces(ask, places): Promise<PlaceMatch[]>; rankShortcuts(momentDescription, shortcuts): Promise<ShortcutMatch[]> }`
  - `getMoment(now: Date): { label: string; description: string }`
  - `searchAI: SearchAI` from `src/search/provider.ts`

- [ ] **Step 1: Install the SDK and document the key**

Run: `pnpm add @typesafe-ai/sdk`

Append to `.env.dist`:

```
TYPESAFE_API_KEY=<your-typesafe-api-key>
```

Tell the user to add a real `TYPESAFE_API_KEY` to `.env.local` (from https://console.typesafe.ai/keys) if it is not there yet. Check with `grep -c TYPESAFE_API_KEY .env.local` — do not print the value.

- [ ] **Step 2: Create `src/search/search-ai.ts`**

```ts
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
```

- [ ] **Step 3: Create `src/search/moment.ts`**

```ts
const parisFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  weekday: "long",
  month: "numeric",
  hour: "numeric",
  hourCycle: "h23",
});

const WEEKDAYS_FR: Record<string, string> = {
  Monday: "lundi",
  Tuesday: "mardi",
  Wednesday: "mercredi",
  Thursday: "jeudi",
  Friday: "vendredi",
  Saturday: "samedi",
  Sunday: "dimanche",
};

type Label = { fr: string; en: string };

function slotFor(hour: number): Label {
  if (hour >= 5 && hour < 11) return { fr: "matin", en: "morning" };
  if (hour >= 11 && hour < 14) return { fr: "midi", en: "midday" };
  if (hour >= 14 && hour < 18) return { fr: "après-midi", en: "afternoon" };
  return { fr: "soir", en: "evening" };
}

function seasonFor(month: number): string {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export type Moment = { label: string; description: string };

// `description` is also the cache key for shortcut suggestions (7 × 4 × 4 buckets).
export function getMoment(now: Date): Moment {
  const parts = Object.fromEntries(parisFormatter.formatToParts(now).map((p) => [p.type, p.value]));
  const weekday = parts.weekday;
  const slot = slotFor(Number(parts.hour));
  return {
    label: `Idées pour ce ${WEEKDAYS_FR[weekday]} ${slot.fr}`,
    description: `${weekday} ${slot.en}, ${seasonFor(Number(parts.month))}`,
  };
}
```

- [ ] **Step 4: Sanity-check `getMoment`**

Run:
```bash
npx tsx -e 'import("./src/search/moment.ts").then(({ getMoment }) => { console.log(getMoment(new Date("2026-09-27T13:30:00Z"))); console.log(getMoment(new Date("2026-01-05T06:00:00Z"))); })'
```
Expected:
```
{ label: 'Idées pour ce dimanche après-midi', description: 'Sunday afternoon, autumn' }
{ label: 'Idées pour ce lundi matin', description: 'Monday morning, winter' }
```

- [ ] **Step 5: Create `src/search/jev/questions.ts`**

```ts
import { noul } from "@typesafe-ai/sdk";

// Every Jev instruction and criterion lives here so they can be reviewed and
// tuned (TypeSafe Playground) in one place. English on purpose: Jev is most
// accurate in English; the place data itself stays French.

export const REGION = "Coastal nature spots around La Ciotat, Provence, France";

export const PLACE_FITS = noul(
  "The place in `place` is a good match for the nature outing described in `request`.",
  {
    true: "The place's description or tips show it meets the needs, audience or activity in the request.",
    false: "Nothing in the place's data supports the request, or the data contradicts it.",
  },
);

export function tipIsUseful(index: number) {
  return noul(
    `\`place.tips[${index}]\` is useful to someone planning the outing described in \`request\`.`,
    {
      true: "The tip helps plan or enjoy this specific outing.",
      false: "The tip is unrelated to the request.",
    },
  );
}

export function ideaIsTimely(key: string) {
  return noul(
    `\`ideas.${key}\` is a timely outing idea to suggest for the moment in \`moment\`.`,
    {
      true: "The idea suits this day, time of day and season.",
      false: "The idea is out of place at this moment (e.g. swimming in winter, sunset in the morning).",
    },
  );
}
```

- [ ] **Step 6: Create `src/search/jev/jev-search-ai.ts`**

```ts
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
```

If `tsc` rejects the `state` literal (e.g. `null` not assignable to the SDK's `EntryType`), fix it with a type-safe change (e.g. build the object with `import type { JsonValue } from "@typesafe-ai/sdk"` annotations) — do not use `any`.

- [ ] **Step 7: Create `src/search/provider.ts`**

```ts
import type { SearchAI } from "./search-ai";
import { createJevSearchAI } from "./jev/jev-search-ai";

// To switch model: implement SearchAI in a new adapter and change this line.
export const searchAI: SearchAI = createJevSearchAI();
```

- [ ] **Step 8: Live smoke test of the adapter** (requires `TYPESAFE_API_KEY` in `.env.local`; skip with a note if absent)

Run:
```bash
npx tsx -e 'import("dotenv").then(d => d.config({ path: ".env.local", quiet: true })).then(() => import("./src/search/provider.ts")).then(async ({ searchAI }) => {
  console.log(await searchAI.rankShortcuts("Sunday afternoon, autumn", [{ id: "a", label: "Coucher de soleil" }, { id: "b", label: "Baignade au calme" }]));
  console.log(JSON.stringify(await searchAI.rankPlaces({ text: "avec deux enfants", needs: [] }, [{ id: "p", name: "Parc du Mugel", commune: "La Ciotat", type: "parc", description: "Jardin ombragé au pied du Bec de l’Aigle.", tips: [{ id: "t", text: "Allées ombragées, poussette possible." }] }])));
})'
```
Expected: two arrays with `relevance` numbers between 0 and 1 (no exception).

- [ ] **Step 9: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: clean.

```bash
git add src/search package.json pnpm-lock.yaml .env.dist
git commit -m "feat(search): SearchAI port with Jev adapter and Paris moment helper"
```

---

### Task 3: Search service, corpus query and server action

**Files:**
- Create: `src/search/types.ts`
- Create: `src/search/search-service.ts`
- Modify: `src/corpus/queries.ts` (add `getSearchCorpus` after `getActivePlaces`)
- Create: `app/(landing)/actions.ts`

**Interfaces:**
- Consumes: `searchAI`, `SearchAsk`, `PlaceDoc`, `PlaceMatch` (Task 2); `getMoment` (Task 2); `prisma.searchShortcut` (Task 1); `resolveCoverPhoto`, `DisplayPhoto` from `src/corpus/place-photos.ts`; `coverPhotoInclude` in `queries.ts`.
- Produces (used by Task 4):
  - `src/search/types.ts`: `ShortcutView`, `ShortcutSuggestions`, `SearchResultPlace`, `SearchResult`
  - `getShortcutsForNow(): Promise<ShortcutSuggestions>`
  - `findPlaces(input: { text: string | null; shortcutIds: string[] }): Promise<SearchResult>`
  - Server action `searchPlaces(input: { text: string; shortcutIds: string[] }): Promise<SearchResult>` in `app/(landing)/actions.ts`

- [ ] **Step 1: Read the Next docs** — `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` (sections on `use cache`, `connection()`, and non-deterministic operations) and `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`.

- [ ] **Step 2: Create `src/search/types.ts`**

```ts
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
```

- [ ] **Step 3: Add `getSearchCorpus` to `src/corpus/queries.ts`** (right after `getActivePlaces`; `Claim` is already imported as a type)

```ts
export type SearchCorpusPlace = PlaceWithCover & { claims: Pick<Claim, "id" | "claimText">[] };

export async function getSearchCorpus(): Promise<SearchCorpusPlace[]> {
  "use cache";
  cacheTag("corpus");
  cacheLife("corpus");
  return prisma.place.findMany({
    where: { status: "ACTIVE" },
    orderBy: { demandRank: "asc" },
    include: {
      photos: coverPhotoInclude,
      claims: {
        where: { isPublic: true, status: "PUBLISHED" },
        orderBy: { createdAt: "asc" },
        select: { id: true, claimText: true },
      },
    },
  });
}
```

- [ ] **Step 4: Create `src/search/search-service.ts`**

```ts
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
  const firstSentence = text.match(/^.*?[.!?](?=\s|$)/s)?.[0] ?? text;
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
```

- [ ] **Step 5: Create `app/(landing)/actions.ts`**

```ts
"use server";

import { z } from "zod";
import { findPlaces } from "@/src/search/search-service";
import type { SearchResult } from "@/src/search/types";

const SearchInput = z
  .object({
    text: z
      .string()
      .trim()
      .max(300)
      .transform((text) => text || null),
    shortcutIds: z.array(z.string().max(50)).max(20),
  })
  .refine((input) => input.text !== null || input.shortcutIds.length > 0);

export async function searchPlaces(input: { text: string; shortcutIds: string[] }): Promise<SearchResult> {
  const parsed = SearchInput.safeParse(input);
  if (!parsed.success) return { status: "error" };
  return findPlaces(parsed.data);
}
```

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: clean.

```bash
git add src/search/types.ts src/search/search-service.ts src/corpus/queries.ts "app/(landing)/actions.ts"
git commit -m "feat(search): search service, corpus query and searchPlaces server action"
```

---

### Task 4: Wire the landing `SearchHero`

**Files:**
- Modify: `app/(landing)/page.tsx`
- Rewrite: `src/components/landing/SearchHero.tsx`

**Interfaces:**
- Consumes: `getShortcutsForNow()` (Task 3), `searchPlaces` action (Task 3), types from `src/search/types.ts` (Task 3), `PhotoImage` (`src/components/PhotoImage.tsx`), `GUIDE_HREF` (`src/components/landing/shared.ts`), icons from `./icons`.
- Produces: `SearchHero({ shortcuts }: { shortcuts: Promise<ShortcutSuggestions> })`.

- [ ] **Step 1: Update `app/(landing)/page.tsx`**

Add the import:

```ts
import { getShortcutsForNow } from "@/src/search/search-service";
```

Replace `<SearchHero />` with (the promise is deliberately not awaited — the hero streams the badge row under its own `<Suspense>`):

```tsx
      <SearchHero shortcuts={getShortcutsForNow()} />
```

- [ ] **Step 2: Rewrite `src/components/landing/SearchHero.tsx`**

```tsx
"use client";

import Link from "next/link";
import { Suspense, use, useRef, useState, useTransition, type FormEvent } from "react";
import { searchPlaces } from "@/app/(landing)/actions";
import type { SearchResult, SearchResultPlace, ShortcutSuggestions } from "@/src/search/types";
import { PhotoImage } from "../PhotoImage";
import { ArrowIcon, BulbIcon, SearchIcon } from "./icons";
import { GUIDE_HREF } from "./shared";

const BADGE_GRID = "grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-nowrap md:justify-center md:gap-2.5";
const BADGE_SHAPE =
  "flex min-h-15 items-center justify-center gap-2.5 rounded-2xl border-3 px-3.5 py-2 text-[14px] leading-[1.25] md:min-h-auto md:h-12.5 md:justify-start md:rounded-full md:px-5 md:text-[15px]";
const MOMENT_LABEL = "pt-1 text-[13px] text-[#BFD8D6] md:text-[14px]";

function WaveDivider() {
  return (
    <div aria-hidden className="h-14 leading-none md:h-24">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="block"
      >
        <path
          d="M0 60 C 240 30, 480 90, 720 62 C 960 34, 1200 84, 1440 56 L1440 120 L0 120 Z"
          fill="#1F6474"
        />
        <path
          d="M0 78 C 160 50, 330 42, 520 70 C 680 94, 820 52, 1000 44 C 1170 38, 1310 74, 1440 64 L1440 120 L0 120 Z"
          fill="#C2653A"
        />
        <path
          d="M0 100 C 260 84, 500 114, 760 100 C 1010 86, 1240 112, 1440 98 L1440 120 L0 120 Z"
          fill="#F5EFE4"
        />
      </svg>
    </div>
  );
}

function ShortcutPlaceholders() {
  return (
    <>
      <span className={MOMENT_LABEL}>&nbsp;</span>
      <div aria-hidden className={BADGE_GRID}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${BADGE_SHAPE} w-full border-white/10 bg-white/10 md:w-44`} />
        ))}
      </div>
    </>
  );
}

function ShortcutBadges({
  suggestions,
  selected,
  onToggle,
}: {
  suggestions: Promise<ShortcutSuggestions>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const { label, shortcuts } = use(suggestions);

  return (
    <>
      <span className={MOMENT_LABEL}>{label}</span>
      <div className={BADGE_GRID}>
        {shortcuts.map((shortcut) => {
          const active = selected.includes(shortcut.id);
          return (
            <button
              key={shortcut.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(shortcut.id)}
              style={{
                borderColor: shortcut.bgColor,
                background: active ? "#FFFFFF" : shortcut.bgColor,
                color: shortcut.fgColor,
              }}
              className={`${BADGE_SHAPE} ${active ? "font-bold" : "font-semibold"}`}
            >
              {shortcut.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

function ResultCard({ place }: { place: SearchResultPlace }) {
  return (
    <article className="flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-[#E4DACA] bg-[#FFFDF8] md:rounded-[20px]">
      <div className="flex items-center gap-3 p-3.5 md:block md:p-0">
        <div className="relative size-18 shrink-0 overflow-hidden rounded-xl bg-[#D9E4E2] md:h-[150px] md:w-full md:rounded-none">
          {place.cover && <PhotoImage photo={place.cover} sizes="(min-width: 768px) 380px, 72px" />}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 md:hidden">
          <h3 className="font-landing-display text-[19px] leading-[1.2] font-semibold">{place.name}</h3>
          <span className="text-[13px] text-[#5B6663]">{place.commune}</span>
        </div>
      </div>
      <div className="flex grow flex-col gap-2.5 px-3.5 pb-3.5 md:gap-2.5 md:px-5 md:pt-1 md:pb-5">
        <div className="hidden flex-col gap-0.5 md:flex">
          <h3 className="font-landing-display text-[21px] leading-[1.2] font-semibold">{place.name}</h3>
          <span className="text-[13px] text-[#5B6663]">{place.commune}</span>
        </div>
        {place.excerpt && (
          <p className="text-[15px] leading-[1.45] font-semibold text-[#2E3A3C]">{place.excerpt}</p>
        )}
        {place.tips.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {place.tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-[14px] leading-[1.45] text-[#3E4A4B]">
                <BulbIcon className="mt-0.5 size-3.75 shrink-0 text-[#A34A25]" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={`/lieux/${place.slug}`}
          className="mt-auto flex h-9 items-center gap-1.5 pt-1.5 text-[15px] font-semibold text-[#0E4B5A] no-underline md:h-auto"
        >
          Voir la fiche
          <ArrowIcon className="size-4" />
        </Link>
      </div>
    </article>
  );
}

function Results({ result, pending, onClear }: { result: SearchResult; pending: boolean; onClear: () => void }) {
  return (
    <section
      aria-live="polite"
      aria-busy={pending}
      className={`mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-10 transition-opacity md:gap-6 md:px-8 md:pb-24 ${
        pending ? "opacity-60" : ""
      }`}
    >
      {result.status === "error" ? (
        <div className="flex flex-col gap-2.5 border-t border-[#E4DACA] pt-7 md:pt-10">
          <p className="text-[17px] leading-[1.5] text-[#1D2A2E] md:text-[19px]">
            La recherche est indisponible pour le moment.{" "}
            <Link href={GUIDE_HREF} className="font-semibold text-[#0E4B5A]">
              Voir tous les lieux du guide
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5 border-t border-[#E4DACA] pt-7 md:pt-10">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-landing-display text-[24px] font-semibold md:text-[32px]">{result.title}</h2>
              <button
                type="button"
                onClick={onClear}
                className="shrink-0 border-0 bg-transparent text-[14px] font-semibold text-[#4A5557] underline md:text-[15px]"
              >
                Effacer
              </button>
            </div>
            <span className="text-[13px] leading-[1.4] text-[#6A7472]">Conseils d’Alexandre et des gens d’ici</span>
            <p className="mt-1 max-w-[820px] text-[17px] leading-[1.5] text-[#1D2A2E] md:text-[19px]">
              {result.intro}
            </p>
          </div>

          {result.status === "ok" && (
            <div className="flex flex-col gap-4 md:gap-5">
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3 md:gap-5">
                {result.places.map((place) => (
                  <ResultCard key={place.slug} place={place} />
                ))}
              </div>
              <p className="text-[14px] text-[#4A5557] md:text-[15px]">
                Pas tout à fait ça ?{" "}
                <a href="#" className="font-semibold text-[#0E4B5A]">
                  Précisez votre demande
                </a>{" "}
                ou{" "}
                <a href="#" className="font-semibold text-[#0E4B5A]">
                  dites-moi ce qui manque
                </a>
                .
              </p>
            </div>
          )}

          {result.status === "empty" && (
            <div className="flex flex-col gap-3.5 rounded-[20px] border border-[#E4DACA] bg-[#FFFDF8] p-5 md:w-[760px] md:p-7">
              <p className="text-[15px] leading-[1.5] text-[#3E4A4B] md:text-[16px]">
                Je suis prévenu et j’irai vérifier. Laissez votre email si vous voulez la réponse.
              </p>
              <form className="flex flex-col gap-2.5 md:flex-row">
                <label htmlFor="mail" className="sr-only">
                  Votre email
                </label>
                <input
                  id="mail"
                  type="email"
                  placeholder="votre@email.fr (facultatif)"
                  className="h-12.5 grow rounded-full border border-[#D5CAB6] bg-white px-4.5 text-[16px]"
                />
                <button
                  type="button"
                  className="h-12.5 rounded-full border-0 bg-[#0E4B5A] px-5.5 text-[16px] font-semibold text-white"
                >
                  Me prévenir
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function SearchHero({ shortcuts }: { shortcuts: Promise<ShortcutSuggestions> }) {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [pending, startTransition] = useTransition();
  // Only the latest search may update the results (older, slower ones are dropped).
  const latestRequest = useRef(0);

  function runSearch(nextText: string, nextSelected: string[]) {
    const requestId = ++latestRequest.current;
    if (!nextText.trim() && nextSelected.length === 0) {
      setResult(null);
      return;
    }
    startTransition(async () => {
      const next = await searchPlaces({ text: nextText, shortcutIds: nextSelected });
      if (requestId !== latestRequest.current) return;
      startTransition(() => setResult(next));
    });
  }

  function toggleShortcut(id: string) {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    setSelected(next);
    runSearch(text, next);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch(text, selected);
  }

  function clear() {
    latestRequest.current++;
    setText("");
    setSelected([]);
    setResult(null);
  }

  return (
    <>
      <div style={{ background: "#0E4B5A" }} className="text-white">
        <section className="mx-auto flex max-w-[800px] flex-col items-center gap-4 px-4 pt-10 pb-7 md:gap-5 md:px-0 md:pt-24 md:pb-14">
          <h1 className="text-center font-landing-display text-[36px] leading-[1.08] font-semibold tracking-[-0.015em] md:text-[64px] md:leading-[1.06]">
            Où aller en nature autour de La Ciotat ?
          </h1>
          <p className="max-w-[640px] text-center text-[17px] leading-[1.5] text-[#CFE3E1] md:text-[20px]">
            Décrivez votre sortie, je vous dis où aller. Avec les conseils vérifiés des gens d’ici.
          </p>

          <form onSubmit={submit} className="relative mt-3.5 flex w-full max-w-[760px] items-center">
            <label htmlFor="q" className="sr-only">
              Décrivez votre sortie
            </label>
            <input
              id="q"
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={300}
              placeholder="Ex. : samedi matin, avec deux enfants et sans voiture"
              className="h-14.5 w-full rounded-full border-0 bg-white pr-19 pl-5 text-[16px] text-[#1D2A2E] shadow-[0_10px_30px_rgba(4,26,32,0.35)] md:h-17 md:pr-19 md:pl-7 md:text-[18px] md:shadow-[0_12px_36px_rgba(4,26,32,0.35)]"
            />
            <button
              type="submit"
              aria-label="Chercher"
              disabled={pending}
              className="absolute right-1.5 flex size-11.5 items-center justify-center rounded-full border-0 bg-[#A34A25] text-white disabled:opacity-60 md:right-2 md:size-13"
            >
              <SearchIcon className="size-5 md:size-5.5" />
            </button>
          </form>

          <Suspense fallback={<ShortcutPlaceholders />}>
            <ShortcutBadges suggestions={shortcuts} selected={selected} onToggle={toggleShortcut} />
          </Suspense>
        </section>
      </div>
      <WaveDivider />

      {result && <Results result={result} pending={pending} onClear={clear} />}
    </>
  );
}
```

- [ ] **Step 3: Verify types, lint, tests and build**

Run: `npx tsc --noEmit && pnpm lint && pnpm test && pnpm build`
Expected: all clean; `/` still listed in the build output as partially prerendered (◐). If the build fails with a Cache Components error about `connection()` / uncached data outside `<Suspense>` on `/`, re-read `08-caching.md` and fix it within the same design (promise created in the page, consumed with `use()` inside the hero's `<Suspense>`). Do not add `export const dynamic` or disable caching.

- [ ] **Step 4: Commit**

```bash
git add "app/(landing)/page.tsx" src/components/landing/SearchHero.tsx
git commit -m "feat(landing): wire SearchHero to Jev shortcuts and place search"
```

---

### Task 5: Manual verification (user)

No code. The controller runs steps 1–2 and hands steps 3–7 to the user (no browser automation in this project).

- [ ] **Step 1:** `grep -c TYPESAFE_API_KEY .env.local` → `1` (ask the user to add the key if `0`).
- [ ] **Step 2:** Build without the key to prove the lazy client: `TYPESAFE_API_KEY= pnpm build` → build succeeds.
- [ ] **Step 3 (user):** `pnpm dev`, open `/`. The label under the search box reads "Idées pour ce <jour> <moment>" (e.g. "Idées pour ce mercredi après-midi"), and 4 shortcut badges appear after a short placeholder.
- [ ] **Step 4 (user):** Click one badge → results appear with that shortcut's intro, ≤ 3 cards each with photo (or grey block), commune, excerpt, ≤ 2 tips, and "Voir la fiche" opening `/lieux/<slug>`. Click a second badge → title shows both labels joined by " · " and the generic intro.
- [ ] **Step 5 (user):** Type "baignade avec des enfants" and press Entrée with no badge → results with generic intro. Type something absurd ("ski de fond") → the "pas encore de conseil fiable" empty block. "Effacer" resets input, badges and results.
- [ ] **Step 6 (user):** Set `TYPESAFE_API_KEY=bad` in `.env.local`, restart dev → badges still show (default first 4 by order), and a search shows "La recherche est indisponible pour le moment." with a link to `/lieux`. Restore the key.
- [ ] **Step 7 (user):** Rapidly toggle badges on/off → final results match the final selection; deselecting everything with an empty input hides results.
