# 11 — Admin Ingestion UI (places, capture, review)

Supersedes the "Ingestion Draft Review — Design" doc and the flow/data-model
sections of `10-corpus-ingestion.md` (which remains authoritative for purpose,
access, extraction-prompt philosophy, image storage, and out-of-scope rules).

Three separate surfaces, deliberately. The previous single-flow design tried to
create places, sources, and claims in one approval path, which produced dead
ends (a draft with no identifiable place could never be approved) and
per-draft/per-claim provenance conflicts. Splitting them makes each surface
simple enough to be bulletproof.

---

## Surface 1 — `/admin/places` (manual, no AI)

A place is a handful of factual fields read off a map. Extraction adds risk and
saves nothing, so there is **no model call here**.

- **List view**: searchable table of all places (name, commune, département,
  status, `demandRank`, published-claim count). Links to edit each.
- **Create/edit form** — fields per `01-data-model.md`: name, slug
  (auto-slugified from name, editable), commune, département (13 | 83), lat,
  lng, type, governingAuthority, officialInfoUrl, description, demandRank,
  status (DRAFT | ACTIVE | RETIRED), and `zapef: Boolean` (see
  `04-signal-ops.md` — ZAPEF sites keep restricted access at `rouge` but not at
  `noir`/extrême).
- **Zone assignment** lives here too (checkbox list of `SignalZone`s covering
  this place, per `04-signal-ops.md` setup) — it's a place-level fact, not an
  ingestion concern.
- Status is chosen explicitly at creation. A place intended to be public is
  created ACTIVE; there is no separate publish step elsewhere.

Places must exist before claims can be captured against them. This ordering is
a feature: it forces the demand-ranking decision (which places are worth
covering) to be deliberate rather than a side effect of whatever you happened
to photograph.

---

## Surface 2 — `/admin/ingest` (claims capture, multi-source)

### Structure

**Step 1 — place (required).** Searchable select over existing places. No
free-text place creation here; a "créer un lieu" link opens Surface 1 in a new
tab if the place is missing. The whole capture is scoped to one place.

**Step 2 — one or more source blocks.** Each block is an independent unit of
evidence:

| field | notes |
|-------|-------|
| `sourceHint` | free text: "email OT Saint-Cyr, 20 juillet 2026", "panneau sur place (photo)", "post r/marseille" |
| `sourceType` | optional select from `SourceType`; if blank, the model infers it from the hint |
| `text` | optional textarea (paste) |
| `images` | optional, 1–5 images |

A block must have at least one of `text` / `images`. "Ajouter une source"
appends another block; blocks are removable before submit. Typical capture:
block 1 = the OT's email text, block 2 = your own field note, block 3 = a photo
of the trailhead sign.

**Submit** creates one `IngestionDraft` (the container, holding the place) and
one `IngestionBlock` per block, then runs extraction **per block,
independently**.

### Extraction is per block — never combined

Each block's extraction call sees only that block's text and images (plus the
place name as context). All claims extracted from a block inherit that block's
source. The model is **never** asked to attribute claims across blocks: wrong
provenance is worse than a missing claim, and cross-attribution is precisely
what models fail at silently.

Consequences, both desirable:

- A block that fails (blurry photo, malformed JSON) gets `status = ERROR` on its
  own row; the other blocks are unaffected and still reviewable.
- Retry is scoped to a single block.

Cost, accepted: a claim that would require cross-referencing two blocks isn't
produced automatically. Handle it manually — approve from one block and adjust
`verification` upward, since a cross-check is exactly the kind of judgment that
should be yours.

### Extraction prompt changes (extends the 7 rules in `10-corpus-ingestion.md`)

- **Rule 8 — source structuring**: if a source is indicated or clearly
  deducible, structure it into `source` (type from the injected `SourceType`
  taxonomy, `dateCollected` ISO, `reliability` 1–3, optional notes). If none is
  identifiable, return `source: null` — never invent one.
- **Rule 9 — place mismatch**: the target place is given. If the input clearly
  concerns a *different* place, do not silently attribute claims to the given
  one — return the claims with `placeMismatch: true` and name the place the
  input actually refers to in `reasoning`. (Replaces rule 7's
  `needsPlaceSelection`, which is moot now that place is chosen at capture.)
- **Verification ceiling by source type**: `FIELD_VERIFIED` may only be
  proposed when the block's source type is `PERSONAL_VISIT`. Anything else caps
  at `OFFICIAL` (institutional written source) or `LOCAL_TESTIMONY`. Enforced
  again server-side at approval (see below) — the model's classification is a
  draft, not a guarantee.

---

## Surface 3 — `/admin/review/[draftId]`

### Layout

Header: the place (name, commune, link to its admin page), capture date, and
per-block progress ("2 sources · 5 revendications, 3 en attente").

**Then one section per block**, in capture order:

- **Block header**: the raw `sourceHint` verbatim, block status.
- **Left**: that block's original input — `inputText`, each image rendered
  inline from bytes (`<img src="data:...">`, server component reads directly —
  fine at MVP volume per the storage note in `10-corpus-ingestion.md`),
  `transcript` if present.
- **Right, top**: **source card** — editable fields from `draftSource` (type,
  urlOrRef, dateCollected, reliability, notes). If `draftSource` is null,
  fields start empty and are required before any claim in this block can be
  approved. **Editable until every claim in the block is resolved** (a
  correction noticed at claim 3 *should* propagate to claims 1–2 — they share
  the row by design; this is a single-user tool, not an audit-locked system).
- **Right, below**: **claim cards** for that block, one per draft claim:
  - `sourceSnippet` rendered directly under the editable `claimText`.
  - Editable: claimType, conditions (multi-select from taxonomy), audience
    (multi-select), verdict, verification, decayClass, `verifiedOn` (default
    today), `isPublic` (default false).
  - Read-only context: `reasoning`, plus visible badges for `needsReview` and
    `placeMismatch` when true.
  - Approve / Reject, each an independent form submit — approving claim 2 must
    not require claims 1 and 3 to validate.
  - Resolved cards stay visible, read-only: approved ones link to the created
    `Claim` and **render from that row**, not from the draft JSON; rejected ones
    are greyed.
- **Block actions**: "Tout approuver" / "Tout rejeter" for that block's pending
  claims. `ERROR` blocks show the raw model output plus "Réessayer
  l'extraction" instead of cards.

**Footer**: "Ajouter une source à cette capture" — same server action as
capture, appends a block to an existing draft. Useful when a photo turns up
after the fact.

### The quality bar, on screen

Render the four questions from `02-corpus-ops.md` as static text beside the
claim cards, always visible:

> Assez précis pour être vérifiable (heure, chiffre, lieu nommé) ? ·
> Conditionnel (sa vérité change selon les circonstances) ? ·
> A coûté quelque chose à obtenir (visite, conversation, recoupement) ? ·
> **Aurais-je pu l'écrire sans quitter mon bureau → supprimer.**

This is the cheapest possible defense of the moat. The extraction prompt
enforces the bar on the model; this enforces it on the reviewer at claim 20 on
a phone, which is when it actually erodes.

### Publication defaults (fixes the stranded-records defect)

Approval **is** the human review — there is no second review stage and no
corpus browser to flip records in later. Therefore:

- An approved `Claim` is created with `status = PUBLISHED` by default.
  `DRAFT` remains available as a deliberate per-card opt-out.
- `isPublic` stays **false** by default and is opted into per claim — that's the
  giveaway line from `03-public-site.md` (2–3 hook claims per place public, the
  conditional depth reserved for the concierge), not a review gate.
- Place status is set explicitly on Surface 1, so nothing depends on ingestion
  to become visible.

---

## Data model

Replaces the single `IngestionDraft` in `10-corpus-ingestion.md`.

```prisma
model IngestionDraft {
  id        String            @id @default(cuid())
  createdAt DateTime          @default(now())
  placeId   String            // required — chosen at capture
  place     Place             @relation(fields: [placeId], references: [id])
  status    DraftStatus       @default(PENDING_REVIEW) // derived from blocks
  blocks    IngestionBlock[]

  @@index([status, createdAt])
}

model IngestionBlock {
  id              String         @id @default(cuid())
  draftId         String
  draft           IngestionDraft @relation(fields: [draftId], references: [id], onDelete: Cascade)
  order           Int            // capture order

  // raw input, kept verbatim so retry never needs re-upload
  inputSourceHint String?
  inputSourceType String?        // optional user-provided SourceType
  inputText       String?
  inputImages     Bytes[]        // cleared once the block is fully resolved (retention note in 10)
  transcript      String?

  rawModelOutput  Json?
  draftSource     Json?          // DraftSourceSchema shape, editable at review
  draftClaims     Json           // array of draft claims, each with a stable `id`
  sourceId        String?        // set when the first claim in this block is approved
  source          Source?        @relation(fields: [sourceId], references: [id])
  status          BlockStatus    @default(PENDING_REVIEW)

  @@unique([draftId, order])
}

enum BlockStatus {
  PENDING_REVIEW
  ERROR
  RESOLVED   // every claim in this block approved or rejected
}
```

Notes:

- **Draft claims keep stable ids.** Each element of `draftClaims` gets a
  generated `id` at write time plus `resolution: "pending" | "approved" |
  "rejected"` and, once approved, `claimId`. All server actions key on that id,
  **never on array position** — otherwise a re-extraction shifts indexes under
  the UI and actions hit the wrong claim.
- Claims stay loose `Json` (consistent with the deliberate looseness note in
  `10-corpus-ingestion.md`); strict validation happens at approval, against the
  real `Claim` model.
- Approved values are **not** copied back into `draftClaims` beyond `claimId` —
  the `Claim` row is the single source of truth; the review screen reads
  approved cards from it.
- Rollup: block → `RESOLVED` when no claim is pending. Draft → `APPROVED` when
  all blocks are RESOLVED and ≥1 claim was approved; `REJECTED` when all blocks
  are RESOLVED and none was.
- `dateCollected` uses `z.coerce.date()` in the zod schema (Prisma expects
  `DateTime`, the model emits an ISO string).

---

## Server actions

`app/admin/ingest/actions.ts`

- `createCapture(placeId, blocks[])` — creates the draft + blocks, runs
  extraction per block, returns the draft id.
- `addBlock(draftId, block)` — appends one block to an existing draft and
  extracts it.

`app/admin/review/[draftId]/actions.ts`

- `approveClaim(blockId, claimId, editedClaim, editedSource?)`
  1. Validate `editedClaim` against the real claim rules (conditions non-empty
     unless `PERMANENT`; `ALTERNATIVE` verdict requires a resolvable
     `alternativePlaceSlug`; taxonomy values valid).
  2. Enforce the verification ceiling: `FIELD_VERIFIED` only if the block's
     source type is `PERSONAL_VISIT`. Reject with a clear message otherwise.
  3. If the block has no `sourceId` yet: validate `editedSource` is complete,
     create the `Source`, set `IngestionBlock.sourceId`. If it already has one
     and `editedSource` differs, **update that row** (see source-editing rule
     above) rather than ignoring the edit.
  4. Create the `Claim` (place = the draft's place, source = the block's
     source, `status` default `PUBLISHED`).
  5. Set that draft claim's `resolution = "approved"` and `claimId`.
  6. Roll up block, then draft.
- `rejectClaim(blockId, claimId)` — JSON-only update + rollup. No `Claim`,
  `Source`, or `Place` writes.
- `retryExtraction(blockId)` — re-runs extraction for that block only, from the
  stored raw input. **Blocked if any claim in the block is already resolved**
  (returns an explicit error rather than silently discarding resolutions and
  orphaning created `Claim` rows). In practice this means retry is available on
  `ERROR` and untouched `PENDING_REVIEW` blocks.
- `approveAllInBlock(blockId, editedClaims[])` / `rejectAllInBlock(blockId)` —
  thin loops over pending claims using the per-claim logic.

---

## Testing

Vitest, existing `vi.hoisted()` Prisma-mock convention. Server actions only; no
new e2e/UI infra.

- Approve creates a `Claim` and lazily creates the block's `Source`; a second
  approval in the same block reuses that `Source`.
- Two blocks in one draft produce two distinct `Source` rows; claims are
  attributed to their own block's source.
- Reject writes only JSON — no `Claim`/`Source` rows.
- Rollup in both directions: last pending claim resolved flips block to
  RESOLVED; all-rejected draft → REJECTED, ≥1 approved → APPROVED.
- Approve fails with a validation error when source fields are incomplete and
  the block has no `sourceId`.
- Approve fails when `verification = FIELD_VERIFIED` on a non-`PERSONAL_VISIT`
  block.
- Editing source fields at claim 3 updates the shared `Source` row (does not
  create a second one).
- `retryExtraction` overwrites draft fields on an untouched block, and is
  refused on a block with any resolved claim.
- Actions resolve claims by stable id, not array index (regression guard:
  re-extraction reorders claims, an action still targets the right one).

## Out of scope (unchanged)

No URL fetching/scraping · no auto-publish regardless of model confidence · no
batch upload of multiple captures · `pnpm corpus:sync-seed-files` export
deferred · no admin surface for browsing/editing the published corpus (stats
stay terminal-side via `pnpm corpus:stats`).
