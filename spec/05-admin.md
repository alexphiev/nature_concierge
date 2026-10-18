# 05 — Admin (`/admin`)

A private tool for Alexandre: manage places and photos, turn raw field
material (an email, a signpost photo, an arrêté, a screenshot) into reviewed
claims, and review contributions from the community. Human approval is
mandatory and final; nothing is auto-published.

## Access

`proxy.ts` protects `/admin/:path*` (pages and their server-action POSTs) with
HTTP Basic Auth against `ADMIN_PASSWORD` (timing-safe compare) and adds
`X-Robots-Tag: noindex`. Single user, not linked from the public site.

Every admin server action also calls `assertAdmin()`
(`src/admin/assert-admin.ts`) first, which re-checks the Basic Auth header
itself, so an action stays protected even if the proxy matcher changes.
Contributor accounts never grant admin access.

## Navigation

`AdminNav`: Corpus (`/admin`) · Lieux (`/admin/places`) · Contributions ({n})
(`/admin/contributions`, n = PENDING count) · Nouvelle capture
(`/admin/ingest`).

## `/admin` — dashboard

Ingestion drafts grouped by status (PENDING_REVIEW, ERROR, APPROVED,
REJECTED), each linking to its review page.

## `/admin/places` — places (no AI)

- **List**: all places with name, commune, département, status, rank and
  published-claim count.
- **Create / edit** (`PlaceForm`): name, slug (auto from name, editable),
  commune (autocomplete via `/admin/api/geo/communes`, the free api-adresse.data.gouv.fr
  API), département, lat/lng (filled automatically from name + commune via
  `/admin/api/geo/geocode`, Google Geocoding, editable), type, parent place, governing authority, official info URL,
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

## `/admin/contributions` — review queue

Lists PENDING contributions, oldest first (UNCONFIRMED ones are invisible).
Each card shows type, place (or proposed name, commune and location hint),
contributor (name, commune, email), date, text and photo thumbnails;
corrections quote the current tip. Empty: « Aucune contribution à relire. »
Each card has an optional note field (quoted in the decision email, capped at
1000 characters) and a « Refuser » button with an optional reason.

A refused validation redirects to `/admin/contributions?erreur={code}&c={id}#c-{id}`
and shows the message in a `role="alert"` line at the top of that card (only
if the card is gone, e.g. already decided, a banner at the top of the page
shows it instead). Codes: `texte` (« Le texte doit faire entre 10 et 500
caractères. »), `theme` (« Thème inconnu. »), `photos` (« Cochez au moins une
photo, ou utilisez « Refuser ». »), `conseil` (« Ce conseil n’est plus en ligne. »).
Unknown codes render nothing. Every successful decision redirects back to
`/admin/contributions` so a previous error never lingers.

The geo endpoints used by the place forms live under `/admin/api/geo/*`
(`communes`, `geocode`): behind the admin Basic-auth middleware and
re-checked with `assertAdmin()` (401 JSON otherwise).

| Type | Approve action | Effect |
|---|---|---|
| TIP | Editable text and theme, « Publier » | Creates a `Source` (type `contribution`) and a PUBLISHED public `Claim` (LOCAL_TESTIMONY, GO, SEASONAL, `verifiedOn` = now, `authorId` = contributor) |
| CORRECTION of a tip | « Modifier le conseil » (editable « Nouveau texte du conseil ») / « Retirer le conseil » / « Noter sans changement » | Updates the claim text and `verifiedOn`, retires the claim, or only records the decision. The first two need the claim to be still PUBLISHED, otherwise nothing changes (card shows « Ce conseil n'est plus en ligne. ») |
| CORRECTION of the place | « Noter », with a link « À appliquer dans la fiche du lieu » | Records the decision; Alexandre edits the place by hand |
| PLACE | « Créer le brouillon » | Creates a DRAFT `Place` (unique slug from the name, `description` = text + « Comment le trouver : … », `proposedById`, placeholder département 13, La Ciotat coordinates and type SITE to fix) and redirects to `/admin/places/{id}` |
| PHOTOS | « Garder » checkbox per photo, « Publier la sélection » | Creates one `PlacePhoto` per kept photo (same object key, `credit` = contributor name, appended to the order) and deletes the other objects. Nothing kept: no change |

Rejecting sets REJECTED with the note and deletes a PHOTOS contribution's
objects.

**Atomic gate**: every decision first runs an `updateMany` on
`id + status PENDING (+ type)` (in the same transaction as its effects, except
for a refusal), and does nothing if no row was updated, so a double click or two tabs cannot
publish twice. Every approval (tip, photo, correction including « Noter », place draft) calls
`updateTag("corpus")`, so the contributor count and « Merci à » refresh; the decision email is sent after commit and a send
failure is only logged (it never rolls the decision back). Decision emails
and subjects are listed in `08-infra.md`.

No search, filters, pagination or history view.

## Out of scope

URL fetching / scraping, auto-publish at any confidence, bulk upload, a
corpus browser (stats stay in `pnpm corpus:stats`).
