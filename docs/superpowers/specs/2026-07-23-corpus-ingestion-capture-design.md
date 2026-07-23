# Design — Corpus Ingestion: Capture + Extraction

Source spec: `spec/10-corpus-ingestion.md`. Step (B) of the 4-step
corpus-ingestion tool (step A, the `/admin` foundation — auth, schema shell,
dashboard — is already built and merged). This step ships the capture form
and Gemini extraction, writing `IngestionDraft` rows. No review/approve UI
yet — that's step (C), a separate design/plan/build cycle.

## Spec changes since step (A) was designed

Several spec files were updated while step (A) was in flight, all discovered
and reconciled while designing this step:

- `spec/06-concierge-ops.md` and `spec/07-measurement.md` both dropped their
  CLI scripts (`request:log`, `metrics:weekly`) in favor of `/admin/requests`
  and `/admin/metrics` screens, reusing the same draft-then-review
  architecture this step builds. Not built here — noted for context on why
  the `/admin` app is the right long-term home for this pattern.
- `spec/10-corpus-ingestion.md`: `IngestionDraft.inputImages` changed from
  `String[]` (storage URLs) to `Bytes[]` (bytes stored directly in
  Postgres) — a new "Image storage" section explains the rationale: no
  object-storage dependency at MVP volume (tens of captures/week, a few
  hundred KB per image), with an explicit retention policy (clear
  `inputImages` once a draft reaches `APPROVED`/`REJECTED`) and an
  automation trigger for when to add real object storage later. **This
  step does not build the retention-cleanup job** — that's naturally part
  of step (C), since it happens at approval/rejection time, which this
  step doesn't implement.
- `spec/08-infra.md`: added `GEMINI_API_KEY` to the secrets list, dropped
  `REVALIDATE_TOKEN` (admin-triggered revalidation now reuses the admin
  session instead of a separate token — not relevant to this step, noted
  for completeness), and its "Environments" section was fixed (already
  committed, stale docker-compose reference removed — this project uses a
  single shared Neon database, no local Postgres).

## Scope

**In:**
- Migration: `IngestionDraft.inputImages` `String[]` → `Bytes[]`.
- `GEMINI_API_KEY` and `GEMINI_MODEL` env vars (model name is
  operator-chosen via env var, not hardcoded in code — Gemini model
  versions change too fast to bake into source).
- `app/admin/new/page.tsx` — capture form: textarea (pasted text), file
  input (1–5 images), optional existing-place selector.
- A server action performing extraction: image transcription (if images
  present) → combined structured extraction call → zod validation →
  `IngestionDraft` write (`PENDING_REVIEW` or `ERROR`) → redirect to
  `/admin`.
- Blurry/unusable image handling: if transcription yields no usable text,
  write `"aucun texte exploitable détecté"` into that image's transcript
  contribution rather than silently proceeding with empty context.

**Out (later steps):**
- `/admin/review/[draftId]` — the review/edit/approve/reject screen.
- Any DB write from approval (real `Place`/`Claim` rows) — this step only
  ever writes `IngestionDraft` rows.
- `pnpm corpus:sync-seed-files`.
- Image retention cleanup (happens at approval/rejection time, step C).
- `/admin/requests`, `/admin/metrics` — separate specs, separate steps.

## Gemini SDK (verified against live docs, not training data)

This project's `AGENTS.md` instruction to check current docs before writing
code applies doubly here — Gemini model names and APIs change fast. Verified
via two independent live fetches of `ai.google.dev`'s current documentation
(structured-output and image-understanding pages) during design, not
assumed from training data:

- **Package**: `@google/genai` (current GA SDK; the older
  `@google/generative-ai` is deprecated — do not use it).
- **Client**: `import { GoogleGenAI } from "@google/genai"; const client =
  new GoogleGenAI({});` — the client reads `GEMINI_API_KEY` from the
  environment automatically.
- **API shape**: the **Interactions API**
  (`client.interactions.create({...})`), not the older `generateContent()`
  pattern.
- **Structured output**: pass `response_format: { type: "text", mime_type:
  "application/json", schema: <JSONSchemaObject> }`; response text is at
  `interaction.output_text`, parsed with `JSON.parse` then validated with
  zod (`zod`'s `z.fromJSONSchema()` can derive a Zod schema from the same
  JSON Schema object used in the request, per the fetched docs — verify
  this specific API exists in the installed zod version during
  implementation, since it's an unusual method name worth double-checking
  rather than assuming).
- **Multimodal input**: `input` accepts an array of typed content blocks —
  `{ type: "text", text: "..." }` and `{ type: "image", data:
  <base64String>, mime_type: "image/jpeg" }` for inline images (no file
  upload needed for MVP-sized images).
- **Model name**: NOT hardcoded — read from `process.env.GEMINI_MODEL`, set
  by the operator (you), since model names/versions move faster than this
  codebase should track in source.

## Extraction flow

```
1. Server action receives: pasted text (optional), image files (0-5,
   optional), selected place slug (optional).

2. If images present:
   For each image, one Interactions API call:
     input: [{ type: "text", text: "Transcribe/describe any relevant text
       visible in this image (signage, document, screenshot)." },
       { type: "image", data: base64, mime_type }]
   If the response is empty/unusable → that image's contribution to
   `transcript` is "aucun texte exploitable détecté" instead of blank.
   All image transcripts are concatenated into `IngestionDraft.transcript`.

3. Combined input (pasted text + transcript) → one structured extraction
   call with response_format matching:
     { place: DraftPlace | null, claims: DraftClaim[] }
   System instruction encodes all 7 non-negotiable rules from
   10-corpus-ingestion.md verbatim (falsifiable-only extraction, taxonomy-
   constrained conditions/audience unless PERMANENT, conservative
   verification classification, mandatory sourceSnippet per claim, fixed
   enum values only, prefer under-extraction, never invent a Place).
   Taxonomy values (CONDITIONS, AUDIENCES from src/corpus/taxonomy.ts) and
   the fixed enum value lists (ClaimType, Verdict, Verification,
   DecayClass) are passed into the prompt context so the model works from
   the actual current taxonomy, not a stale hardcoded list.

4. zod validates the parsed JSON against a schema requiring `sourceSnippet`
   on every claim (rule 4 — "a claim without a traceable snippet is
   rejected by the schema validator before it reaches review").

5a. Any failure (API error/timeout, malformed JSON, zod validation
    failure) → IngestionDraft written with status=ERROR, rawModelOutput =
    the raw model response (or error message) for manual debugging.
5b. Success → IngestionDraft written with status=PENDING_REVIEW,
    draftPlace/draftClaims populated from the validated extraction.

6. Redirect to /admin (the existing dashboard — shows the new draft under
   its status section; /admin/review/[draftId] doesn't exist yet).
```

## Data model change

```prisma
model IngestionDraft {
  // ...unchanged fields...
  inputImages    Bytes[]   // was String[] — bytes stored directly, see spec
  // ...unchanged fields...
}
```

## Testing / verification

- `pnpm exec prisma migrate dev` applies the `inputImages` type change
  cleanly.
- Submitting text-only input via `/admin/new` → a new row appears on
  `/admin` under "À relire" (PENDING_REVIEW) with a real preview string.
- Submitting an image-only input → transcript populated, draft appears
  under PENDING_REVIEW (or ERROR if the image is genuinely unreadable —
  test with a deliberately blank/solid-color test image to confirm the
  "aucun texte exploitable détecté" path).
- Submitting input that should yield zero claims (a weak/generic
  statement, per rule 6) → draft still writes successfully with
  `draftClaims: []`, not an error — under-extraction is a valid outcome,
  not a failure.
- Deliberately breaking the API key (wrong value) → draft written with
  status=ERROR, visible under "Erreurs" on the dashboard.
- `pnpm exec tsc --noEmit` clean; `pnpm build` succeeds; `/admin/new` route
  present.

## Out of scope for this step (explicit non-goals)

Everything listed under "Out" above. Also: no client-side image
compression/resizing (defer until real usage reveals whether it's needed at
MVP volume), no upload progress indicator (small form, low volume, not
worth the complexity yet).
