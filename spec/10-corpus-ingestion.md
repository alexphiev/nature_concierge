# 10 — Corpus Ingestion (private `/admin` capture tool)

## Purpose

Field capture (an email, a signpost photo, an arrêté PDF page, a screenshot of
a Reddit thread already judged worth acting on) is the highest-value moment for
corpus growth, and it usually happens on a phone, not in an editor. This tool
turns raw input into **draft** Place/Claim records for review — it is a
convenience layer on top of the seed-file system (`02-corpus-ops.md`), not a
replacement for it. Human approval remains mandatory and final, forever.

The same draft-then-review pattern (unstructured input → AI-drafted structured
fields → human edits/confirms on one screen) is reused for concierge request
logging at `/admin/requests/new` — see `06-concierge-ops.md`. It's the same
architecture solving the same shape of problem twice, not a second system.

## Access

`/admin` — protected by a single shared secret (Basic Auth or a simple
session cookie from a password env var). Single user (Alexandre). Not linked
from anywhere public, `noindex`. This is not a security-hardened multi-tenant
system; it's a locked door on a private tool.

## Scope (explicit)

- ✅ Input: raw text paste, image upload (signage, documents, screenshots).
- ✅ Output: draft `Place` and/or `Claim` rows at `status = PENDING`, never
  auto-published.
- ✅ Single review screen: source alongside draft, inline edit, approve/reject.
- ❌ No URL fetching / scraping in v1. If a page is worth citing, paste the
  relevant text yourself — you're already reading it. (Revisit only for
  *registered signal sources* in `04-signal-ops.md`, a separate, narrow,
  stable-format concern — not a general ingestor.)
- ❌ No batch/bulk upload. One input event → one review session. Volume is
  low; building queueing machinery now is premature.
- ❌ No auto-publish path, ever, regardless of model confidence score.

## Flow

```
1. /admin/new
   - Textarea (paste text) AND/OR image upload (1–5 images), multipart.
   - Optional: existing place selector (if the input is clearly about a place
     already in the DB) — otherwise "new place" is inferred/drafted.
   - Submit → server action calls extraction (below) → redirect to
     /admin/review/[draftId].

2. Extraction (server-side)
   - Images → Gemini Flash multimodal: transcribe/describe relevant text
     (signage, document, screenshot content) into plain text first — this
     transcript is stored and shown in review, so you can catch OCR errors.
   - Text (pasted or transcribed) → Gemini Flash structured extraction call
     (strict prompt, see below) → JSON matching a zod schema:
     { place?: DraftPlace, claims: DraftClaim[] }
   - Any schema/parse failure → draft saved with status ERROR + raw model
     output visible in review screen for manual fix. Never silently drop input.

3. /admin/review/[draftId]
   - Left: original input (text and/or images, transcript if applicable).
   - Right: editable form per draft claim (all Claim fields from
     01-data-model.md) and draft place fields if a new place was proposed.
   - Each claim shows its `sourceSnippet` (exact quote/paraphrase the model
     cited) directly under the editable claimText — evidence next to
     assertion, not hidden.
   - Actions per claim: Approve (→ PUBLISHED or DRAFT per existing site
     workflow, your choice at approval time), Edit fields then Approve,
     Reject (kept, status RETIRED, never deleted — model-error audit trail).
   - Whole-draft actions: Approve all, Reject all.
   - On approval: rows are written directly via Prisma (not through the
     seed-file pipeline) but tagged `source.type` appropriately and
     retrievable by `pnpm corpus:sync-seed-files` — a one-way export that
     appends newly approved DB-only entries back into the matching
     `src/corpus/places/*.ts` file, keeping git as the long-term source of
     truth without forcing hand-typing at capture time.

4. /admin (dashboard)
   - List of drafts by status: PENDING_REVIEW, ERROR, APPROVED (recent),
     REJECTED (recent). This is the whole admin home page — no analytics,
     no corpus browser (that's `pnpm corpus:stats` in the terminal).
```

## Extraction prompt requirements (the actual risk surface — encode literally)

The system prompt for the Gemini Flash extraction call must enforce, not
suggest, the quality bar from `02-corpus-ops.md`. Non-negotiable instructions:

1. **A claim earns extraction only if it is falsifiably specific** (a number,
   an hour, a named spot, a concrete threshold). If the input only supports a
   generic statement ("c'est fréquenté l'été"), **do not emit a claim** —
   generic statements are explicitly worse than no claim.
2. **Every claim needs `conditions` and `audience`** populated from the fixed
   taxonomy (pass `taxonomy.ts` values into the prompt context), unless the
   claim is genuinely permanent (topography/exposure) — in which case
   `decayClass = PERMANENT` and `conditions` may be empty, but the model must
   justify this explicitly in a `reasoning` field shown in review.
3. **Classify `verification` conservatively**: text from an official source
   (préfecture, mairie reply) → `OFFICIAL`. A Reddit/Instagram screenshot or
   secondhand text → `LOCAL_TESTIMONY` at best, never `FIELD_VERIFIED` (only
   Alexandre's own visits are `FIELD_VERIFIED`, set manually).
4. **`sourceSnippet` is mandatory per claim** — the exact substring or close
   paraphrase of the input that grounds it. A claim without a traceable
   snippet is rejected by the schema validator before it reaches review.
5. **Assign `claimType` and `verdict` from the fixed enums only** (pass enum
   values in context); if genuinely ambiguous, default `verdict = GO_IF` and
   flag `needsReview: true` rather than guessing GO or AVOID.
6. **Prefer under-extraction.** Explicit instruction: "It is better to extract
   zero claims from a weak input than to invent a plausible-sounding one. Do
   not pad the output to seem thorough."
7. **Never invent a `Place`** if the input is ambiguous about which place it
   concerns — emit `place: null` and flag `needsPlaceSelection: true`
   instead, forcing the review screen to prompt for manual place linking.

## Error handling

- Model call failure/timeout → draft status `ERROR`, raw error + input
  preserved, retry button in review screen (re-runs extraction on the same
  stored input, does not require re-upload).
- Schema validation failure (model returned malformed JSON, or a claim without
  a `sourceSnippet`) → same `ERROR` path, with the offending raw model output
  shown so you can fix by hand rather than losing the capture.
- Image transcription producing nothing usable (blurry photo) → surfaced
  explicitly ("aucun texte exploitable détecté") rather than a silent empty draft.
- All failures are recoverable from the dashboard; nothing requires re-capturing
  the source input from scratch.

## Data model additions (extends `01-data-model.md`)

```prisma
model IngestionDraft {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  inputText     String?
  inputImages   Bytes[]  // stored directly in Postgres — see storage note below
  transcript    String?  // from image extraction, editable, shown in review
  rawModelOutput Json?   // for ERROR debugging
  status        DraftStatus @default(PENDING_REVIEW)
  draftPlace    Json?    // proposed Place fields, nullable
  draftClaims   Json     // array of proposed Claim fields incl. sourceSnippet, reasoning, needsReview flags
}

enum DraftStatus {
  PENDING_REVIEW
  ERROR
  APPROVED
  REJECTED
}
```

## Image storage — no dedicated object storage in the MVP

The review screen needs the original photo available next to the draft claim
so a bad transcription is easy to catch — that's the only requirement. At MVP
volume (tens of captures/week, a few hundred KB per image), that need is met
by storing the bytes directly on `IngestionDraft.inputImages` in the same
Postgres database, not by adding S3/Vercel Blob/a bucket as a new infra
dependency. No new secret, no new line in `08-infra.md`.

Retention: keep image bytes while a draft is `PENDING_REVIEW` or `ERROR`
(you still need to look at it). Once a draft reaches `APPROVED` or
`REJECTED`, the permanent record is the text (`sourceSnippet`, `transcript`),
not the photo — clear `inputImages` on that draft immediately, or on a
30–90 day job if you want a short grace window to re-check something. This
bounds database growth without a retention policy that needs its own service.

**Automation trigger**: only move to real object storage (Vercel Blob, or an
EU S3-compatible bucket) if capture volume or image sizes grow enough to
visibly bloat the database or slow backups. Not before.

(Kept as loose `Json` for draft payloads deliberately — the taxonomy will
shift; only *approved* data needs to conform strictly to the real `Claim`
model, enforced at the moment of approval, not at draft time.)

## Dogfooding check before relying on this tool

Before treating this as faster than manual seed-file typing: feed it the
Saint-Cyr email verbatim and compare its draft claims against the four
Port d'Alon claims already hand-written in `02-corpus-ops.md`'s example. If
the draft needs heavy rewriting to reach the same quality, the tool is saving
less time than it appears to on paper — worth knowing in one afternoon rather
than assuming.

## Cost note

Gemini Flash calls are cents-level at this volume (tens of captures/week).
No budget concern at MVP scale; revisit only if volume grows by orders of
magnitude.
