# 05 — Admin (`/admin`)

A private tool for Alexandre: manage places and photos, and turn raw field
material (an email, a signpost photo, an arrêté, a screenshot) into reviewed
claims. Human approval is mandatory and final; nothing is auto-published.

## Access

`proxy.ts` protects `/admin/:path*` (pages and their server-action POSTs) and
`/api/geo/:path*` (geocode and commune lookups used by the place form) with
HTTP Basic Auth against `ADMIN_PASSWORD` (timing-safe compare) and adds
`X-Robots-Tag: noindex`. Single user, not linked from the public site.

`/api/geo/geocode` calls the billed Google Geocoding API, so it must stay
behind the matcher. The browser re-sends the Basic Auth credentials on
same-origin `fetch` calls from the admin page, so the place form needs no
extra handling.

## Navigation

`AdminNav`: Corpus (`/admin`) · Lieux (`/admin/places`) · Nouvelle capture
(`/admin/ingest`). The planned contributions queue adds
`/admin/contributions`.

## `/admin` — dashboard

Ingestion drafts grouped by status (PENDING_REVIEW, ERROR, APPROVED,
REJECTED), each linking to its review page.

## `/admin/places` — places (no AI)

- **List**: all places with name, commune, département, status, rank and
  published-claim count.
- **Create / edit** (`PlaceForm`): name, slug (auto from name, editable),
  commune (autocomplete via `/api/geo/communes`, the free api-adresse.data.gouv.fr
  API), département, lat/lng (filled automatically from name + commune via
  `/api/geo/geocode`, Google Geocoding, editable), type, parent place, governing authority, official info URL,
  description, `demandRank`, Google Place id, status.
- **Photos** (`PlacePhotoFields`): JPEG/PNG/WebP/HEIC. HEIC is converted to
  JPEG in the browser (`heic-to`); files over 1.5 MB are compressed in the
  browser (`browser-image-compression`, max 2400 px). Each photo has a credit
  and can be reordered or removed. The place is saved first, then each photo
  is uploaded by its own server action (≤ 4 MB, under Vercel's body limit).
- **Images pratiques** (`PlaceImageFields`): external image URLs + source.

Photo storage (`src/storage/place-photos.ts`): Neon Object Storage, bucket
`place-photos` (`public_read`), key `places/{placeId}/{uuid}.{ext}`, objects
immutable (`Cache-Control: public, max-age=31536000, immutable`). The DB
stores keys, not URLs. Removing a photo deletes its object.

Places must exist before claims can be captured for them, which keeps "which
places are worth covering" a deliberate decision.

## `/admin/ingest` — capture

1. Pick a place (required; no place creation here).
2. Add one or more **source blocks**, each one unit of evidence: source hint
   (« email OT Saint-Cyr, 20 juillet »), optional source type, pasted text
   and/or 1–5 images.
3. Submit: each block is extracted independently (Gemini, `GEMINI_MODEL`,
   via `@google/genai`): images are first transcribed to text (shown in review
   to catch OCR errors), then text → structured JSON validated by zod
   (`src/corpus/ingestion-schema.ts`): one draft `Source` + draft claims, each
   with a mandatory `sourceSnippet`. Each draft claim is then scored by Jev
   (`02-corpus-ops.md`).

Extraction prompt rules (`src/corpus/block-extraction.ts`): only falsifiably
specific claims; conditions and audience from the taxonomy unless PERMANENT
(with reasoning); conservative `verification` (never FIELD_VERIFIED from
secondhand text); enum values only, ambiguous verdict → GO_IF +
`needsReview`; prefer extracting nothing over padding.

Failures (model error, invalid JSON, missing snippet) store the block as
ERROR with the raw output and a retry button; input is never lost. Raw images
stay in Postgres (`IngestionBlock.inputImages`).

## `/admin/review/[draftId]` — review

Per block: the original input (text, images, transcript) beside editable draft
claims (all `Claim` fields), each with its source snippet, quality score badge
and the quality-bar questions always visible. The block's draft `Source` is
editable once and shared by all its claims.

Actions are keyed on stable draft-claim ids, never array positions:

- **Approve**: validates the claim (conditions, alternative place, taxonomy,
  FIELD_VERIFIED only for PERSONAL_VISIT sources), creates the block's
  `Source` on first approval (later edits update it), creates the `Claim`
  (`status` PUBLISHED by default, `isPublic` opt-in per claim), stores its
  quality score.
- **Reject**: JSON-only, no rows created.
- **Approve all / reject all** per block; **retry extraction** only on blocks
  with no resolved claim; « Ajouter une source » appends a block.
- Rollup: a block is RESOLVED when no claim is pending; a draft is APPROVED
  when all blocks are resolved with ≥ 1 approval, REJECTED otherwise.

Every mutation calls `updateTag("corpus")`.

## Out of scope

URL fetching / scraping, auto-publish at any confidence, bulk upload, a
corpus browser (stats stay in `pnpm corpus:stats`).
