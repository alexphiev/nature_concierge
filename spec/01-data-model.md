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
RETIRED, `proposedById` (→ `User`, `SetNull`; set when the place came from a
contribution, shown as « Lieu proposé par {name} »).

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

**Kind**: `kind` (PRACTICAL_INFO | LOCAL_TIP, default LOCAL_TIP) separates
practical info (formal, factual, checkable against a source: hours, prices,
rules, access) from lived tips (a local's informal advice: when to go, where
the shade is, what to avoid). The two are shown as separate blocks on the
place page. New claims get it from the contributor's form (editable at
review) or, for ingestion and seeding, from `guessClaimKind`
(`src/corpus/claim-kind.ts`). Existing claims are sorted once with
`pnpm corpus:split-kinds` (dry run + CSV, `--overrides`, `--apply`).

**Attribution**: `authorId` (→ `User`, `SetNull`) and `authorDeleted`.
`authorId = null && !authorDeleted` is Alexandre's own tip, credited
« Alexandre · La Ciotat » from `GUIDE_AUTHOR` in `src/site.ts` (existing claims
are not backfilled). `authorDeleted = true` is credited « Un ancien
contributeur ». Name and commune edits on `/compte` show on tips through the
live join.

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

## Accounts (Better Auth)

Tables managed by Better Auth through its Prisma adapter, in our Neon DB:
`User` (table `user`: `name` = public display name, `email` unique and never
shown, `emailVerified`, `commune String?`), `Session`, `Account` (required by
Better Auth even with only magic links) and `AuthVerification` (table
`verification`, holds the magic-link tokens; named differently because the
`Verification` enum exists). `/admin` keeps its Basic Auth: contributor
accounts never grant admin access.

## Contributions

`Contribution` is one table for all four types, with typed nullable columns:

- `type` TIP | CORRECTION | PLACE | PHOTOS; `status` UNCONFIRMED | PENDING |
  APPROVED | REJECTED.
- `userId` (→ `User`, cascade; null while UNCONFIRMED).
- `pendingEmail`, `pendingName`, `pendingCommune`: identity held for a
  signed-out submit until the magic link is clicked.
- `placeId` (TIP, CORRECTION, PHOTOS), `claimId` (CORRECTION of a tip; null =
  correction of the place itself).
- `text`, `claimType` (TIP theme), `claimKind` (TIP: practical info or lived
  tip, chosen by the form used), `sourceHint` (TIP: where a practical info
  comes from, free text), `correctionKind` (OUTDATED | WRONG |
  MISSING_DETAIL), `placeName`, `placeCommune`, `locationHint` (PLACE),
  `photosConsentAt` (PHOTOS).
- `reviewNote` (quoted in the decision email), `reviewedAt`, `createdAt`.

`ContributionPhoto` (`contributionId` cascade, `key`, `order`): photo objects
in the `place-photos` bucket under `contributions/{contributionId}/{uuid}.{ext}`.

Rules:

- Zod limits (`src/contributions/schema.ts`): tip 10–500 chars, correction
  10–1000, place name 2–120, commune 2–80, location hint ≤ 500, why-this-place
  10–1000, display name 2–40; 1–6 photos.
- At most 10 PENDING per user (and 10 UNCONFIRMED per pending email).
- UNCONFIRMED rows (and their photo objects) older than 7 days are purged at
  the start of each signed-out submit; there is no cron.
- Attaching: on any sign-in, every UNCONFIRMED row whose `pendingEmail` equals
  the verified email gets `userId`, loses its `pending*` fields and becomes
  PENDING (one atomic update per row); the user's name and commune are filled
  from the pending values when empty.
- Approval effects are listed in `05-admin.md`. A published tip creates a
  `Source` of type `contribution` (`urlOrRef` = contribution id).
- Account deletion (`/compte`): the user's claims get `authorDeleted = true`,
  the user is deleted (cascading sessions, accounts and all their
  contributions; `Claim.authorId` and `Place.proposedById` are set to null),
  and the storage objects of their non-approved photo contributions are
  deleted. Approved photos stay (the `PlacePhoto` rows are independent).

## Taxonomy

`src/corpus/taxonomy.ts` exports `CONDITIONS` and `AUDIENCES` as `const`
arrays + zod enums, used by seed validation and the ingestion schema.

The WhatsApp concierge log (`Request`, `RequestClaimUsed`, `RequestClaimCreated`,
the `Channel` / `Outcome` enums) no longer exists: the `community_contributions`
migration dropped it.
