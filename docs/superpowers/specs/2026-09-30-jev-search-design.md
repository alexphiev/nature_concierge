# Landing Search with Jev (TypeSafe)

## Purpose

The landing `SearchHero` currently shows static example answers for 4 hard-coded
badges. Make it real:

1. **Shortcuts**: 20 shortcut buttons are stored in DB; Jev picks the 4 most
   fitting for the current moment (Paris weekday, time of day, season).
2. **Search**: the user selects any number of shortcuts and/or types a request;
   Jev decides which places (name, description, tips) fit best, and which of
   each place's tips are most relevant.

The AI provider sits behind a task-level interface so Jev can be swapped for
another model later without touching the domain logic or the UI.

## Jev constraints that shape the design

From https://docs.typesafe.ai (read 2026-09-30):

- Jev is a "System One" model: `state` (text/JSON) + named typed questions →
  typed answers (`choice`, `score`, `noul` = 0–1 probability of yes). It does
  **not** generate text.
- Endpoint `POST https://api.typesafe.ai/v1/systemone`; official TS SDK
  `@typesafe-ai/sdk` (0.6.0, Node ≥ 20). Reads `TYPESAFE_API_KEY`, defaults to
  model `jev-latest` (override: `TYPESAFE_DEFAULT_MODEL`). Default timeout 10 s,
  built-in retries with backoff (incl. 429).
- Limits (jev-1.13): 32k tokens for state + longest question, 64k total; 40
  req/s, 100k tok/s. Priced per input token only (~$0.042 / Mtok).
- Accuracy drops with large state full of irrelevant detail and with
  indirection → keep each state small and focused.
- Best in English; other languages work with lower accuracy → question
  instructions in English, place data stays French.
- Re-ranking pattern: one Noul per candidate, sort by `noul` in code.
- Put all questions and thresholds in one reviewable file.

Corpus today: 10 active places, 22 public published claims, ~8k chars.

## Decisions

- **No generated text.** Cards show cover, name, commune, description excerpt
  and the Jev-selected tips. Intro is a fixed per-shortcut `intro` (DB) or a
  generic template.
- **Shortcuts driven by the moment only** (weekday + time slot + season,
  computed in code). Not by typed text, not by live status signals.
- **Multi-select** shortcuts combined with optional typed text.
- **Seed only** for the 20 shortcuts; no admin UI.
- **One Jev request per place** (re-ranking pattern), all in parallel. Each
  request carries the `fits` question plus one question per tip (fan-out).
- **No new automated tests** (project convention). Existing tests stay green;
  manual test steps provided.

## Architecture

```
src/search/
  search-ai.ts          Port + plain types. No provider imports.
  provider.ts           export const searchAI: SearchAI = createJevSearchAI();
  jev/questions.ts      All Jev instructions/criteria (single review point).
  jev/jev-search-ai.ts  Jev adapter implementing SearchAI via @typesafe-ai/sdk.
  moment.ts             Paris moment: key + French label + English description.
  search-service.ts     Domain logic: load data, build ask, call searchAI,
                        thresholds / top-N, build UI DTOs.
app/(landing)/actions.ts   Server action `searchPlaces`.
```

Switching model = write `src/search/<provider>/…` implementing `SearchAI`,
change the one line in `provider.ts`. Nothing else imports the SDK.

### Port (`search-ai.ts`)

```ts
export type SearchAsk = { text: string | null; needs: string[] }; // needs = selected shortcut labels

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
  relevance: number;                              // 0–1
  tips: { tipId: string; relevance: number }[];  // 0–1 each
};

export type ShortcutDoc = { id: string; label: string };
export type ShortcutMatch = { shortcutId: string; relevance: number };

export interface SearchAI {
  rankPlaces(ask: SearchAsk, places: PlaceDoc[]): Promise<PlaceMatch[]>;
  rankShortcuts(momentDescription: string, shortcuts: ShortcutDoc[]): Promise<ShortcutMatch[]>;
}
```

Adapters return raw relevance for every input; they do **not** sort, cut or
threshold — that is domain logic in the service. Adapters throw on failure.

### Jev adapter

**rankPlaces**: one `client.systemOne` call per place, `Promise.all`.

State:
```json
{
  "request": { "typed": "samedi matin, sans voiture", "selected_needs": ["Avec de jeunes enfants"] },
  "place": {
    "name": "Parc du Mugel", "commune": "La Ciotat", "type": "…",
    "description": "…",
    "tips": ["…", "…"]
  }
}
```
(`typed` is `null` when empty; `selected_needs` is `[]` when none.)

Questions (drafts in `jev/questions.ts`, to tune in the TypeSafe Playground):
- `fits` — Noul. Instructions: "The place in `place` is a good match for the
  nature outing described in `request`." Criteria true: "The place's
  description or tips show it meets the needs, audience or activity in the
  request." False: "Nothing in the place's data supports the request, or the
  data contradicts it."
- `tip_<i>` for each tip — Noul. Instructions: "`place.tips[<i>]` is useful to
  someone planning the outing described in `request`." True: "The tip helps
  plan or enjoy this specific outing." False: "The tip is unrelated to the
  request."

Map `answers.fits.noul` → `relevance`, `answers.tip_<i>.noul` → tip relevance.

**rankShortcuts**: one call.

State:
```json
{
  "region": "Coastal nature spots around La Ciotat, Provence, France",
  "moment": "Sunday afternoon, autumn",
  "ideas": { "s0": "Coucher de soleil", "s1": "Avec un chien", "…": "…" }
}
```
Question `s<i>` per shortcut — Noul. Instructions: "`ideas.s<i>` is a timely
outing idea to suggest for the moment in `moment`." True: "The idea suits this
day, time of day and season." False: "The idea is out of place at this moment
(e.g. swimming in winter, sunset in the morning)."

Client: one module-level `new TypeSafeClient()` (server-only module).

### Moment (`moment.ts`)

Pure function `getMoment(now: Date)` using `Europe/Paris`:
- weekday: `lundi` … `dimanche`
- slot by Paris hour: 5–11 `matin`, 11–14 `midi`, 14–18 `après-midi`,
  18–5 `soir`
- season by month: 3–5 printemps, 6–8 été, 9–11 automne, 12–2 hiver

Returns `{ label: "Idées pour ce dimanche après-midi", description: "Sunday
afternoon, autumn" }`. The description doubles as the cache key (112 buckets).

### Service (`search-service.ts`)

Constants (top of file):
`SHORTCUTS_SHOWN = 4`, `MAX_RESULTS = 3`, `MIN_PLACE_RELEVANCE = 0.5`,
`MAX_TIPS = 2`, `MIN_TIP_RELEVANCE = 0.5`, `EXCERPT_MAX = 160`.

**`getSuggestedShortcuts(momentDescription)`** — `"use cache"`, `cacheLife("hours")`,
`cacheTag("shortcuts")`. Loads active shortcuts ordered by `order`, calls
`searchAI.rankShortcuts`, returns the top 4 by relevance (ties → `order`).
Throws on AI error (so a failure is never cached).

**`getShortcutsForNow()`** — `await connection()`, compute moment, try
`getSuggestedShortcuts(moment.description)`; on error log and fall back to the first 4
active shortcuts by `order`. Returns `{ label: moment.label, shortcuts }`.

**`findPlaces({ text, shortcutIds })`**:
1. Load selected shortcuts (active only) and the search corpus.
2. Build `SearchAsk` (`text` trimmed or `null`, `needs` = labels in `order`).
3. `searchAI.rankPlaces` → keep `relevance ≥ 0.5`, sort desc, top 3.
4. Per kept place: tips with `relevance ≥ 0.5`, sort desc, top 2.
5. Cover photo via existing `resolveCoverPhoto`.
6. Title = selected labels + typed text joined by ` · `.
   Intro (ok) = the shortcut's `intro` when exactly one shortcut and no text,
   otherwise "Voici les lieux qui correspondent le mieux à votre demande."
   Intro (empty) = always "Je n’ai pas encore de conseil fiable pour cette
   demande."
7. On AI error → `{ status: "error" }` (logged).

Excerpt = first sentence of `description`, cut at `EXCERPT_MAX` chars with `…`;
`null` if no description.

Search corpus query (`src/corpus/queries.ts`, `getSearchCorpus()`): `"use
cache"`, tag `corpus`, active places ordered by `demandRank`, with cover photo
(`coverPhotoInclude`) and public published claims (`isPublic: true, status:
PUBLISHED`). All claim types count as tips.

### Result DTO (shared with UI)

```ts
type SearchResultPlace = {
  slug: string; name: string; commune: string;
  excerpt: string | null; cover: DisplayPhoto | null; tips: string[];
};
type SearchResult =
  | { status: "ok"; title: string; intro: string; places: SearchResultPlace[] }
  | { status: "empty"; title: string; intro: string }
  | { status: "error" };
type ShortcutView = { id: string; label: string; bgColor: string; fgColor: string };
```

### Server action (`app/(landing)/actions.ts`)

`"use server"`; `searchPlaces(input)` validates with zod:
`text` string ≤ 300 chars (optional), `shortcutIds` array of ≤ 20 strings;
at least one non-empty. Invalid → `{ status: "error" }`. Delegates to the
service's `findPlaces`.

## Data

New Prisma model + migration:

```prisma
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

Seed script `scripts/search/seed-shortcuts.ts` (+ `pnpm search:seed`),
idempotent upsert by `label`. Colors cycle through the 4 existing badge
palettes (`#F6D98B/#4A3A0A`, `#A9DCD3/#0B3A44`, `#F6B39A/#5A1E10`,
`#C9E0A8/#2A4318`). Draft labels (owner edits intros/labels freely):

1. Avec de jeunes enfants
2. Première fois à La Ciotat
3. Coucher de soleil
4. Avec un chien
5. Sans voiture
6. Baignade au calme
7. Snorkeling
8. Petite balade (moins de 2 h)
9. Belle randonnée
10. Pique-nique
11. Loin de la foule
12. Un jour de mistral
13. Tôt le matin
14. Par forte chaleur
15. Vue sur la mer
16. Criques et calanques
17. Accessible en poussette
18. Balade tranquille pour seniors
19. Observer la faune et la flore
20. Sortie hors saison

Each gets a one-sentence French `intro` written in the seed.

## UI

- `app/(landing)/page.tsx` passes `shortcutsPromise = getShortcutsForNow()`
  (not awaited) to `SearchHero`.
- `SearchHero` (client) keeps its layout. The badge row + moment label are
  wrapped in `<Suspense>` with 4 neutral placeholder pills; inner component
  reads the promise with `use()`. The input stays mounted and usable while
  shortcuts stream.
- Badges become multi-select (`aria-pressed`). Clicking a badge runs the
  search with the new selection + current text; submitting the form runs it
  with current selection + text. Deselecting the last badge with empty text
  clears results. `useTransition` for pending state (dim results, disable
  submit button, `aria-busy`). Latest request wins.
- Results reuse the current `ResultCard` layout: cover (`PhotoImage`-style,
  placeholder when `null`), name, commune, excerpt (replaces "why"), tips,
  "Voir la fiche" → `/lieux/[slug]`.
- `empty` → existing empty block (email form stays static as today).
- `error` → short message "La recherche est indisponible pour le moment."
  with a link to `/lieux`.
- "Effacer" clears selection, text and results.
- Remove the static `BADGES` / `ANSWERS` mocks and the fake conditions line;
  subtitle becomes "Conseils d’Alexandre et des gens d’ici".

## Config

- `pnpm add @typesafe-ai/sdk`
- `.env.dist`: `TYPESAFE_API_KEY=<your-typesafe-api-key>`

## Out of scope

Admin UI for shortcuts, live-signal-aware shortcuts, text generation (intros /
"why"), rate limiting, logging searches into `Request`, pre-filtering places
when the corpus outgrows ~40 places (rate limit) — revisit then.

## Verification

- `pnpm test`, `pnpm lint`, `npx tsc --noEmit`, `pnpm build` pass.
- Manual: see implementation plan's final task (shortcuts appear with moment
  label; single badge / multi badge / text-only / badge+text searches; empty
  result; error path with a bad `TYPESAFE_API_KEY`).
