# 02 — Corpus Ops (how knowledge physically enters the system)

The corpus is versioned data in the repo, edited in the IDE, validated by zod,
loaded into Postgres by a seed pipeline. Git history = audit trail. No admin UI.

## File layout

```
src/corpus/
  taxonomy.ts            // CONDITIONS, AUDIENCES, REQUEST_TYPES (zod const enums)
  schema.ts              // zod schemas mirroring Prisma + business rules
  places/
    port-d-alon.ts       // one file per place: place + its claims + sources
    la-madrague.ts
    ...
  signal-sources.ts      // SignalSource definitions + place coverage
```

One file per place exports a typed object:

```ts
// src/corpus/places/port-d-alon.ts
import { definePlace } from "../schema";

export default definePlace({
  slug: "port-d-alon",
  name: "Calanque de Port d'Alon",
  commune: "Saint-Cyr-sur-Mer",
  departement: "83",
  lat: 43.1656, lng: 5.6598,
  type: "CALANQUE",
  governingAuthority: "Ville de Saint-Cyr-sur-Mer — Service Espaces Naturels",
  officialInfoUrl: "https://www.var.gouv.fr/…",
  demandRank: 3,
  description: "Calanque préservée entre Saint-Cyr et Bandol, pinède et plage de galets.",
  sources: {
    otStCyr: {
      type: "OT_CONVERSATION",
      urlOrRef: "Email Service Espaces Naturels Saint-Cyr, juillet 2026",
      dateCollected: "2026-07-18",
      reliability: 3,
    },
  },
  claims: [
    {
      claimText: "En code rouge, la calanque reste ouverte 8h–17h mais seuls la pinède et la plage principale sont accessibles, avec un parking fortement réduit.",
      claimType: "DECODING",
      conditions: ["ete", "code-rouge"],
      audience: ["tous"],
      verdict: "GO_IF",
      source: "otStCyr",
      verification: "OFFICIAL",
      decayClass: "ANNUAL_CHECK",
      verifiedOn: "2026-07-18",
      isPublic: true,
    },
    // ...
  ],
});
```

## Validation pipeline (`pnpm corpus:check`, runs in CI)

zod + business rules. A seed that fails any rule does not load:

1. `conditions` non-empty unless `decayClass === "PERMANENT"`.
2. `verdict === "ALTERNATIVE"` ⇒ `alternativePlaceSlug` present and resolvable.
3. Every claim's `source` key resolves within the file.
4. `verifiedOn` ≤ today; SEASONAL claims with `verifiedOn` older than 1 year
   emit a warning list (the pre-season re-verification backlog).
5. Taxonomy values ∈ `taxonomy.ts`.
6. Slug uniqueness across files; departement ∈ {"13","83"}.
7. `claimText` max ~220 chars, single sentence (regex heuristic + warning).

## The quality bar (enforced by review checklist, cited in PR template)

A claim earns its row only if **ChatGPT wouldn't produce it**:

- [ ] Falsifiably specific (an hour, a number, a named spot)?
- [ ] Conditional (its truth flips with circumstances)?
- [ ] Had an acquisition cost (visit / conversation / cross-check)?
- [ ] Could I have written it without leaving my desk? → **delete it.**

High-value claim types to hunt, in descending order of differentiation:
micro-logistics, failure modes, conditional suitability, negative verdicts,
cross-place alternatives (dispersal edges), temporal windows, institutional decoding.

## Seeding commands

- `pnpm corpus:check` — validate only (CI gate).
- `pnpm corpus:seed` — upsert places/claims/sources/signal-sources into Postgres
  (idempotent by slug/natural keys). Never deletes; retirement is a status change.
- `pnpm corpus:stats` — coverage report: claims per place vs demandRank,
  verification mix, re-verification backlog.

## Media-as-leads rule (restated so no builder "helpfully" adds ingestion)

There is no document store, no scraped-content table, no embedding of third-party
text. An Instagram reel or Reddit thread becomes a `Source` row (type `*_LEAD`)
plus a claim **authored by us after verification** — or it becomes nothing.
