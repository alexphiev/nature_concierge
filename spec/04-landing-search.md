# 04 — Landing Page and Search

One page, one job: a visitor describes their outing and gets the places and
tips that fit. French only. The community rework of this page is specified in
`docs/superpowers/specs/2026-10-17-community-contributions-design.md`.

## Structure (`app/(landing)/page.tsx`)

1. **`SearchHero`** — H1 « Où aller en nature autour de La Ciotat ? », sub
   « Décrivez votre sortie, je vous dis où aller. Avec les conseils vérifiés
   des gens d'ici. », a free-text input, and 4 shortcut buttons under a moment
   label (« Idées pour ce samedi soir »). Results render below the hero.
2. **`GuideSection`** — « Tous les lieux du guide »: the first 8 ACTIVE places
   by `demandRank` (3 on mobile) with cover and commune, link to `/lieux`.
3. **`HelpSection`** — « Un coin ou une astuce qui manque ? », CTAs « Proposer
   un lieu » / « Partager une astuce » (WhatsApp links today).

JSON-LD `WebSite` + `Organization`.

## Search

### Behaviour

- Shortcuts are multi-select toggles; clicking one runs the search with the
  current selection + text, submitting the input does the same. Latest
  request wins; pending state dims results.
- Results: up to 3 places (cover, name, commune, description excerpt, up to 2
  relevant tips, « Voir la fiche »), with a title (selected labels + text) and
  an intro (the shortcut's own `intro` when exactly one shortcut and no text).
- Empty: « Je n'ai pas encore de conseil fiable pour cette demande. » plus a
  non-functional email field. Error: « La recherche est indisponible pour le
  moment. » with a link to `/lieux`.
- Known leftovers: the empty-state email form does nothing, and the « Précisez
  votre demande » / « dites-moi ce qui manque » links under results are `#`.

### Architecture

No generated text: the AI only scores relevance; everything displayed comes
from the corpus or the shortcut table.

```
src/search/
  search-ai.ts          Port (SearchAI) + plain types. No provider imports.
  provider.ts           export const searchAI = createJevSearchAI();
  jev/questions.ts      All Jev questions and criteria (single review point).
  jev/jev-search-ai.ts  Jev adapter over @typesafe-ai/sdk.
  moment.ts             Paris weekday / time slot / season → label + key.
  search-service.ts     Domain logic: load data, call searchAI, thresholds.
  types.ts              DTOs shared with the UI.
app/(landing)/actions.ts   searchPlaces server action (zod-validated).
```

Switching AI provider = a new adapter implementing `SearchAI` + one line in
`provider.ts`.

**Jev** (TypeSafe "System One" model): takes a JSON `state` and named
questions, returns typed answers; `noul` = probability of yes. Questions are in
English, place data stays French.

- `rankPlaces`: one Jev call per place, in parallel. State = the request
  (typed text, selected shortcut labels) + the place (name, commune, type,
  description, public tips). Questions: `fits` + one `tip_i` per tip.
- `rankShortcuts`: one call; state = region + moment description + all
  shortcut labels; one question per shortcut (« timely idea for this
  moment »).

**Service thresholds** (`search-service.ts`): 4 shortcuts shown, 3 results
max, place relevance ≥ 0.5, 2 tips max with relevance ≥ 0.5, excerpt = first
sentence ≤ 160 chars.

**Caching**: shortcut ranking is cached per moment bucket (weekday × slot ×
season) for hours (`"use cache"`, tag `shortcuts`); on AI failure it falls
back to the first 4 shortcuts by `order` and nothing is cached. Place search
is never cached. The search corpus (`getSearchCorpus`) is cached under
`corpus`.

### Data

`SearchShortcut` rows (20 labels such as « Avec de jeunes enfants »,
« Coucher de soleil », « Sans voiture », « Un jour de mistral »), each with a
one-sentence `intro` and badge colors. Seeded by `pnpm search:seed`
(idempotent by label); no admin UI.

## Copy rules

Sentence case, plain verbs, no exclamation inflation. The word « IA » appears
nowhere. No « révolutionnaire », « plateforme », « solution ». Counts shown to
visitors are always real, never padded.
