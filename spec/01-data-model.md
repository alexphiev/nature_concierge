# 01 — Data Model (Prisma + PostgreSQL)

`prisma/schema.prisma` is the source of truth for fields and types; this file
explains the models and the rules the schema alone doesn't enforce. Prisma 7,
client generated to `prisma/generated` (gitignored), Neon via
`@prisma/adapter-pg`.

## Rules

1. **A claim is a decision-relevant, conditional, opinionated assertion** —
   one sentence a visitor can act on. Neutral description lives on
   `Place.description`, never in `Claim`.
2. **A claim needs conditions** unless `decayClass = PERMANENT`
   (topography-class facts).
3. **Media are leads, never content.** `Source` records where a lead came
   from; `Claim.claimText` is written by people, never copied from the source.
4. **Taxonomy fields are string arrays** (`conditions`, `audience`) validated
   by zod against `src/corpus/taxonomy.ts`, so adding a value needs no
   migration. Stable single-value fields are Prisma enums.
5. **Only `PUBLISHED` + `isPublic` claims of `ACTIVE` places are public.**
   Every public query filters on these (`src/corpus/queries.ts`).
6. **Nothing is hard-deleted from the corpus.** Places and claims are retired
   via `status = RETIRED`.

## Corpus

### `Place`

Identity (`slug`, `name`, `commune`, `departement` "13"|"83", `lat`, `lng`),
`type` (string; labels in `TYPE_LABELS`: CALANQUE, PLAGE, MASSIF, SENTIER,
SOMMET, SITE, ISLAND, SCENIC_ROAD), `governingAuthority`, `officialInfoUrl`,
`description`, `demandRank` (lower = more demand, drives ordering),
`googlePlaceId` (photo fallback + Maps link), `status` DRAFT | ACTIVE |
RETIRED.

**Hierarchy, two levels max**: a place can have a `parent` (e.g. Anse du Sec
under Calanque du Mugel). Spots are listed on their parent's page; the
parent's claims also show on the spot page as « Valable pour tout {parent} ».

### `PlacePhoto` and `PlaceImage`

- `PlacePhoto`: our uploaded photos (`key` in Neon Object Storage, `credit`,
  `order`). Shown first everywhere; see `03-public-site.md`.
- `PlaceImage`: "images pratiques" — external image URLs (maps, schedules,
  signage) with an optional `source`, shown at the bottom of the place page.

### `Claim`

`claimText`, `claimType` (ACCESS, PRACTICAL, ACTIVITY, NATURE, CROWDING,
SUITABILITY, TIP, SAFETY, AVOID, ALTERNATIVE, DECODING), `conditions[]`,
`audience[]`, `verdict` (GO, GO_IF, AVOID, ALTERNATIVE —
`alternativePlaceId` required for ALTERNATIVE), `sourceId`, `verification`
(FIELD_VERIFIED, OFFICIAL, LOCAL_TESTIMONY, HEURISTIC), `decayClass`
(PERMANENT, SEASONAL, ANNUAL_CHECK), `verifiedOn`, `isPublic`, `status`
(DRAFT, PUBLISHED, RETIRED), `qualityScore` (0–10, from the Jev usefulness
question, see `02-corpus-ops.md`).

### `Source`

Where a claim's knowledge came from: `type` (string, e.g. OFFICIAL,
PERSONAL_VISIT, LOCAL_PERSON, OT_CONVERSATION, *_LEAD), `urlOrRef`,
`dateCollected`, `reliability` 1–3, `notes`.

## Ingestion (admin capture)

- `IngestionDraft`: one capture session, scoped to one `Place`; status
  PENDING_REVIEW | ERROR | APPROVED | REJECTED, rolled up from its blocks.
- `IngestionBlock`: one source of evidence (hint, type, pasted text, images as
  `Bytes[]`, transcript), the model output (`draftSource`, `draftClaims` JSON
  with stable ids and per-claim resolution), and the `Source` created at first
  approval. Status PENDING_REVIEW | ERROR | RESOLVED.

Details in `05-admin.md`.

## Search

`SearchShortcut`: the landing's suggestion buttons (`label`, `intro`,
`bgColor`, `fgColor`, `order`, `active`). Seeded, no admin UI. See
`04-landing-search.md`.

## Legacy — to be removed

`Request`, `RequestClaimUsed`, `RequestClaimCreated` and the `Channel` /
`Outcome` enums were the WhatsApp concierge log. Nothing reads or writes them;
they are dropped as part of the community contributions work.

## Taxonomy

`src/corpus/taxonomy.ts` exports `CONDITIONS` and `AUDIENCES` (plus
`REQUEST_TYPES`, legacy) as `const` arrays + zod enums, used by seed
validation and the ingestion schema.
