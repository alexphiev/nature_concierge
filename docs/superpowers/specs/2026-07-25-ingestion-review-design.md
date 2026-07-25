# Ingestion Draft Review — Design

Implements step C of the corpus-ingestion tool (`spec/10-corpus-ingestion.md`):
`/admin/review/[draftId]`, plus a source-capture addition to `/admin/new`
that step C depends on.

## Why a source field at capture time

The review screen needs a `Source` row (type, dateCollected, reliability,
notes) before any claim can be approved — the real `Claim` model requires
`sourceId`. Originally planned to synthesize this from `verification` at
review time, but that's guessing after the fact from data that doesn't
carry it. Instead, capture a free-text source hint at `/admin/new` (same
UX as the existing text/image inputs) and let the same Gemini extraction
call turn it into structured fields, shown editable at review — matching
how claims are already extracted, not a new mechanism.

## Change 1: capture form gets a Source field

**`app/admin/new/page.tsx`**: add one optional textarea, e.g.:

```
Source (d'où vient cette info ? email, post Reddit, panneau...)
```

Placed near the text/image inputs. Optional — matches the existing
text/images fields, which are also not individually required (`runIngestion`
already accepts any combination). Example values: "email de l'OT
Saint-Cyr, 20 juillet 2026", "post Reddit r/marseille", "panneau affiché
sur place (voir photo)".

**`app/admin/new/actions.ts`**: read `formData.get("sourceHint")`, pass to
`runIngestion` as a new optional `sourceHint?: string` input field, same
trim/undefined-if-empty handling as `text`.

## Change 2: extraction schema and prompt gain a `source` field

**`src/corpus/ingestion-schema.ts`**: add

```ts
export const DraftSourceSchema = z.object({
  type: SourceTypeSchema, // reused from ./schema
  urlOrRef: z.string().nullable(),
  dateCollected: z.string(), // ISO date, model's best guess, editable at review
  reliability: z.number().int().min(1).max(3),
  notes: z.string().nullable(),
});
```

Add `source: DraftSourceSchema.nullable()` to `ExtractionResultSchema`.
`null` when `sourceHint` was blank and nothing in the text/transcript
clearly indicates a source — same "don't invent" discipline as claims and
place.

**`src/corpus/ingestion.ts`**:
- `runIngestion` accepts `sourceHint?: string`, folds it into the combined
  text sent to Gemini with a clear label, e.g. prepended as
  `Source déclarée : {sourceHint}` (same pattern already used for
  `placeSlug` → place name hint).
- `EXTRACTION_SYSTEM_INSTRUCTION` gains an 8th non-negotiable rule:
  > 8. Si une source est indiquée ou clairement déductible du texte,
  > structure-la dans "source" (type tiré de la taxonomie fournie,
  > dateCollected au format ISO, reliability de 1 à 3, notes optionnelles).
  > Si aucune source n'est identifiable, renvoie source: null — ne
  > l'invente jamais.
  Add `SourceType` values to the taxonomy block already injected into the
  prompt (`OFFICIAL, PERSONAL_VISIT, LOCAL_PERSON, OT_CONVERSATION,
  REDDIT_LEAD, INSTAGRAM_LEAD, FACEBOOK_LEAD, PRESS_LEAD`).
- `IngestionDraft.draftPlace`/`draftClaims` pattern extends: store
  `extraction.source` into a new `draftSource: Json?` column (see schema
  change below).

## Change 3: schema — two additions to `IngestionDraft`

```prisma
model IngestionDraft {
  id             String      @id @default(cuid())
  createdAt      DateTime    @default(now())
  inputText      String?
  inputImages    Bytes[]
  inputSourceHint String?    // NEW — the raw text typed into capture's Source field, kept for retry
  transcript     String?
  rawModelOutput Json?
  status         DraftStatus @default(PENDING_REVIEW)
  draftPlace     Json?
  draftClaims    Json        // now: array of { ...claim fields, resolution }
  draftSource    Json?       // NEW — proposed Source fields, nullable
  sourceId       String?     // NEW — set once the shared Source row is created at first approval
  source         Source?     @relation(fields: [sourceId], references: [id])
}
```

`inputSourceHint` stores the raw capture-time text verbatim (same pattern
as `inputText`), so `retryExtraction` can resend the exact original hint
to Gemini rather than trying to reconstruct it from already-structured
`draftSource` output.

- `draftSource` holds the extracted/editable proposal (`DraftSourceSchema`
  shape), shown and edited at review, independent of whether it's been
  materialized into a real row yet.
- `sourceId` is null until the first claim on this draft is approved, at
  which point a real `Source` row is created from the (possibly
  user-edited) `draftSource` fields and cached here; subsequent claim
  approvals on the same draft reuse it. One `Source` per draft, per
  earlier decision.
- Each element of `draftClaims`'s JSON array gains a `resolution: "pending"
  | "approved" | "rejected"` field, defaulting to `"pending"` when
  `runIngestion` writes the draft. No new table — still one `Json` column,
  consistent with the existing "loose Json for draft payloads
  deliberately" note in `10-corpus-ingestion.md`.

Migration: add `draftSource Json?`, `sourceId String?` +
relation/index to `IngestionDraft`.

## Change 4: `/admin/review/[draftId]`

### Layout

- **ERROR-status draft**: dedicated view — raw model output / error
  message, original input (text/images/transcript) shown for context, one
  "Réessayer l'extraction" button.
- **PENDING_REVIEW / APPROVED / REJECTED draft**: split layout.
  - **Left**: original input — `inputText` verbatim, each `inputImages[i]`
    rendered as `<img src="data:{mime};base64,{...}">` inline (server
    component reads bytes directly, no dedicated image route — fine at
    MVP volume per spec's storage note), `transcript` if present.
  - **Right**, top to bottom:
    1. **Source card** — editable fields from `draftSource` (type
       dropdown from `SourceTypeSchema`, urlOrRef, dateCollected date
       input, reliability 1–3, notes). If `draftSource` is null, fields
       start empty and are marked required before the first claim can be
       approved (client-side disable on claim Approve buttons + server
       action re-validates). Read-only / dimmed once `sourceId` is set
       (source is locked after first approval — editing it further would
       silently change already-approved claims' evidence).
    2. **Place card** — only rendered if `draftPlace` is non-null or a
       `placeSlug` was chosen at capture. If linking an existing place:
       shows its name, read-only. If a new place was proposed: editable
       fields (name, commune, département, type, description from
       `DraftPlaceSchema`) plus the fields the real `Place` needs that
       the draft doesn't carry — slug (auto-slugified from name,
       editable), lat/lng (manual numeric entry), demandRank (numeric,
       default 999). Created once, at first claim approval that needs it.
    3. **Claim cards**, one per `draftClaims` element still worth showing
       (all of them, with visually distinct styling for already-resolved
       ones — approved shown with a green check + link-ish state,
       rejected shown greyed out — both read-only, no more actions).
       Each pending card:
       - `sourceSnippet` shown directly under editable `claimText`.
       - Editable: claimType, conditions (multi-select from taxonomy),
         audience (multi-select), verdict, verification, decayClass.
       - Read-only context: `reasoning`, `needsReview` flag (shown as a
         visible badge if true, not hidden).
       - New fields needed by the real `Claim` that the draft doesn't
         carry, editable here: `verifiedOn` (date, default = today),
         `isPublic` (checkbox, default false), `status` (PUBLISHED/DRAFT
         select, default DRAFT).
       - Approve / Reject buttons, each its own form (independent
         server-action submit — approving claim 2 doesn't require claims
         1 and 3 to also be valid).
    4. **Bulk actions** (only shown if ≥1 claim still pending): "Tout
       approuver" / "Tout rejeter" — iterate pending claims with their
       current (possibly already-edited) form values through the same
       per-claim logic.

### Server actions (`app/admin/review/[draftId]/actions.ts`)

- `approveClaim(draftId, claimIndex, editedClaim, editedSource?,
  editedPlace?)`:
  1. Validate `editedClaim` against claim constraints (reuse
     `ClaimInputSchema`-equivalent rules: conditions non-empty unless
     PERMANENT, etc.).
  2. If `sourceId` is not yet set on the draft: validate `editedSource`
     is complete, create the `Source` row, set `IngestionDraft.sourceId`.
     If `sourceId` is already set, ignore `editedSource` (locked).
  3. Resolve the `Place`: if the draft was linked to an existing
     `placeSlug`, use it. Else if `draftPlace` is present and no `Place`
     has been created yet for this draft this session, validate
     `editedPlace` is complete and create it; cache its id similarly to
     source (reuse for later claims on the same draft needing the same
     new place).
  4. Create the `Claim` row from the edited fields + resolved
     `sourceId`/`placeId`.
  5. Update `draftClaims[claimIndex].resolution = "approved"` (and store
     the edited values, so the review screen reflects what was actually
     approved).
  6. Roll up: if no claims remain `"pending"`, set
     `IngestionDraft.status` = `"APPROVED"` if ≥1 claim is `"approved"`,
     else `"REJECTED"`.
- `rejectClaim(draftId, claimIndex)`: sets that claim's `resolution =
  "rejected"`, same rollup check. No DB writes beyond the draft's JSON.
- `retryExtraction(draftId)`: re-runs the same extraction logic
  `runIngestion` uses (transcribe if images present, extract from
  combined text incl. the stored `inputSourceHint`), overwrites
  `draftPlace`/`draftClaims`/`draftSource`/`rawModelOutput` on the same
  row, sets `status` back to `PENDING_REVIEW` or `ERROR` depending on
  outcome. Does not require re-upload (images already in `inputImages`).
- `approveAllPending(draftId, editedClaims[])` /
  `rejectAllPending(draftId)`: thin loops calling the per-claim logic
  above for every currently-pending claim.

### Testing

Unit tests (Vitest, existing `vi.hoisted()` Prisma-mock convention) for
the server actions module:
- Approve creates Claim + lazily creates Source/Place, reuses them on a
  second approval in the same draft.
- Reject only updates JSON, no Claim/Source/Place created.
- Rollup: last pending claim resolved flips draft status correctly in
  both directions (all-rejected → REJECTED; ≥1 approved → APPROVED).
- Approve rejects with a validation error if source fields are incomplete
  and no `sourceId` exists yet.
- Retry re-invokes extraction and overwrites draft fields.

No new e2e/UI test infra — matches the existing testing approach for this
tool (Tasks 1–7 in `docs/superpowers/plans/2026-07-23-corpus-ingestion-capture.md`).

## Out of scope (unchanged from `10-corpus-ingestion.md`)

- No URL fetching/scraping.
- No batch/bulk upload of multiple draft inputs.
- No auto-publish regardless of model confidence.
- `pnpm corpus:sync-seed-files` export (step D) — separate, later.
