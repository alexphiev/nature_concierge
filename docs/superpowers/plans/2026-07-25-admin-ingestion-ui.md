# Admin Ingestion UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-flow ingestion tool (`/admin/new`, one `IngestionDraft` row per capture, one Gemini call per capture) with spec 11's three deliberately-separate surfaces: `/admin/places` (manual place CRUD, no AI), `/admin/ingest` (place-scoped, multi-source-block capture, extraction per block), and a rebuilt `/admin/review/[draftId]` (per-block review, source/claim approval with stable ids, verification-ceiling enforcement).

**Architecture:** `IngestionDraft` becomes a place-scoped container; a new `IngestionBlock` table holds one row per source (raw input, draft extraction output, resolution state), replacing the old flat single-table draft. Extraction runs once per block, never combined across blocks — each block's Gemini call sees only its own text/images plus the place name as context. Approval creates real `Claim`/`Source` rows directly via Prisma (not the seed-file pipeline), with `Claim.status` defaulting to `PUBLISHED` and `isPublic` defaulting to `false` per spec 11's "approval is the human review" principle.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, `@google/genai` (Gemini Interactions API, `gemini-3.6-flash` via `GEMINI_MODEL` env var), zod, Vitest (`vi.hoisted()` Prisma-mock convention).

## Global Constraints

- Authoritative spec: `spec/11-admin-ingestion-ui.md`. `spec/10-corpus-ingestion.md` remains authoritative for purpose, access, extraction-prompt philosophy (the 7 non-negotiable rules), image storage/retention, and out-of-scope rules — both specs bind this plan.
- **Clean cutover, confirmed with user**: delete `app/admin/new/` (`actions.ts`, `page.tsx`), `src/corpus/ingestion.ts`, `src/corpus/ingestion-schema.ts`, and their test files entirely. Do not run the old and new flows in parallel.
- **Places must exist before claims can be captured against them** (spec 11) — `/admin/ingest`'s place selector has no free-text place creation; a "créer un lieu" link opens `/admin/places` in a new tab.
- **Extraction is per block, never combined** — each block's Gemini call is independent; claims from block A can never be attributed by the model to block B's source.
- **Rule 8 (source structuring)** and **Rule 9 (place mismatch, replaces old rule 7's `needsPlaceSelection`)** extend the 7 existing extraction rules from `spec/10-corpus-ingestion.md`.
- **Verification ceiling**: `FIELD_VERIFIED` may only be proposed by the model (and accepted at approval) when the block's `sourceType` is `PERSONAL_VISIT`. Enforced twice: in the extraction prompt (soft) and server-side at approval (hard — reject with a clear error otherwise).
- **Draft claims keep stable ids**, generated at write time, plus a `resolution: "pending" | "approved" | "rejected"` field and (once approved) `claimId`. All server actions key on that id, **never on array position** — a re-extraction must not shift indexes under the UI.
- **Publication defaults**: an approved `Claim` defaults to `status = PUBLISHED` (not `DRAFT` — approval IS the review, no second gate). `isPublic` defaults to `false`, opted into per claim.
- **One `Source` per block**, created lazily at the first claim approval in that block; a second approval in the same block reuses it. Editing source fields **updates the existing row** (not a new one) as long as the block still has pending claims — per spec 11, source fields are "editable until every claim in the block is resolved."
- **Retry is scoped to one block** and **blocked if any claim in that block is already resolved** (return an explicit error, don't silently discard resolved claims or orphan created `Claim` rows).
- **Image display**: inline base64 data URI (`<img src="data:{mime};base64,...">`), server component reads bytes directly — matches this project's established MVP-volume convention, no dedicated image route.
- **`zapef: Boolean`** and zone-assignment (checkbox list of `SignalZone`s, via `ZonePlace`) both live on `/admin/places` — a place-level fact set once at creation, not an ingestion concern. Both fields/models already exist in the schema (merged by the prior zone-status-model plan).
- **Ingest place-picker shows ALL places regardless of status** (confirmed with user) — a place can be captured against before being flipped to `ACTIVE`. Use a new `getAllPlaces()` query; do not reuse `getActivePlaces()`, which stays correctly scoped to `ACTIVE` for the public site.
- `dateCollected` in the draft-source JSON uses ISO strings from the model; Prisma expects `DateTime` — coerce at the Prisma-write boundary (approval), not in the zod schema (matches this project's "loose Json for draft payloads, strict validation only at approval" convention).
- No new test infra beyond Vitest + `vi.hoisted()` Prisma mocks (established convention, see `src/corpus/ingestion.test.ts` from the now-deleted old flow, or `src/corpus/queries.test.ts`, for the exact pattern).
- No browser-based verification (Playwright/Chrome) in any task — per standing user instruction, write manual test steps into each task's report instead.
- Do not build `pnpm corpus:sync-seed-files` (export back to seed files) — explicitly deferred, separate future work.

---

### Task 1: Schema migration — `IngestionBlock`, place-scoped `IngestionDraft`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration via `prisma migrate diff --script` + `migrate deploy` (this sandboxed environment's established non-interactive path — `migrate dev` requires an interactive TTY confirmation unavailable here; see the prior zone-status-model plan's Task 1 report for the exact, already-proven procedure to follow verbatim)

**Interfaces:**
- Consumes: `Place`, `Source` (unchanged), `SignalZone`/`ZonePlace` (already exist, used by Task 6, not this task).
- Produces: `IngestionDraft` (place-scoped container: `id`, `createdAt`, `placeId`+relation, `status: DraftStatus` derived from blocks, `blocks: IngestionBlock[]`), `IngestionBlock` (`id`, `draftId`+relation with `onDelete: Cascade`, `order: Int`, `inputSourceHint: String?`, `inputSourceType: String?`, `inputText: String?`, `inputImages: Bytes[]`, `transcript: String?`, `rawModelOutput: Json?`, `draftSource: Json?`, `draftClaims: Json`, `sourceId: String?`+relation, `status: BlockStatus`), new `BlockStatus` enum (`PENDING_REVIEW | ERROR | RESOLVED`).
- Removes: the old flat `IngestionDraft` (`inputText`, `inputImages`, `transcript`, `rawModelOutput`, `draftPlace`, `draftClaims` directly on the draft) and `DraftStatus`'s old 4-value shape — replaced by the container/block split.

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Replace the current `IngestionDraft` model and `DraftStatus` enum (at the end of the file) with:

```prisma
model IngestionDraft {
  id        String            @id @default(cuid())
  createdAt DateTime          @default(now())
  placeId   String
  place     Place             @relation(fields: [placeId], references: [id])
  status    DraftStatus       @default(PENDING_REVIEW)
  blocks    IngestionBlock[]

  @@index([status, createdAt])
}

model IngestionBlock {
  id              String         @id @default(cuid())
  draftId         String
  draft           IngestionDraft @relation(fields: [draftId], references: [id], onDelete: Cascade)
  order           Int

  inputSourceHint String?
  inputSourceType String?
  inputText       String?
  inputImages     Bytes[]
  transcript      String?

  rawModelOutput  Json?
  draftSource     Json?
  draftClaims     Json
  sourceId        String?
  source          Source?        @relation(fields: [sourceId], references: [id])
  status          BlockStatus    @default(PENDING_REVIEW)

  @@unique([draftId, order])
}

enum DraftStatus {
  PENDING_REVIEW
  ERROR
  APPROVED
  REJECTED
}

enum BlockStatus {
  PENDING_REVIEW
  ERROR
  RESOLVED
}
```

In the `Place` model, add the reverse relation (the old flat model didn't have one — check first, it may not exist yet):

```prisma
  ingestionDrafts    IngestionDraft[]
```

In the `Source` model, add the reverse relation for blocks:

```prisma
  ingestionBlocks    IngestionBlock[]
```

- [ ] **Step 2: Run the migration**

Follow the exact non-interactive procedure from the zone-status-model plan's Task 1 (read `.superpowers/sdd/` history from that plan if available, or replicate: `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` → hand-place the output into a timestamped `prisma/migrations/<timestamp>_ingestion_blocks/migration.sql` folder → `prisma migrate deploy`). Verify with `pnpm exec prisma migrate status` (expect "up to date").

**Data-loss note**: this drops the old flat `IngestionDraft` columns and any existing rows in that table (the confirmed clean-cutover choice). If there are real drafts in `PENDING_REVIEW` on the current dev database, note in your report whether any existed and were lost — this is expected and accepted per the cutover decision, just document it.

- [ ] **Step 3: Regenerate and verify the Prisma Client**

```bash
pnpm exec prisma generate
grep -n "placeId" prisma/generated/models/IngestionDraft.ts
grep -n "draftClaims" prisma/generated/models/IngestionBlock.ts
```

Expected: both return matches confirming the client reflects the new shape.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Replace flat IngestionDraft with place-scoped IngestionDraft + IngestionBlock"
```

---

### Task 2: Delete the old single-flow ingestion code

**Files:**
- Delete: `app/admin/new/actions.ts`, `app/admin/new/page.tsx`, `src/corpus/ingestion.ts`, `src/corpus/ingestion-schema.ts`, `src/corpus/ingestion.test.ts`, `src/corpus/ingestion-schema.test.ts`

**Interfaces:**
- Consumes: nothing (pure deletion).
- Produces: nothing new — this task only removes code superseded by Task 1's schema change and Tasks 3–7's new surfaces.

- [ ] **Step 1: Delete the files**

```bash
rm -rf app/admin/new
rm -f src/corpus/ingestion.ts src/corpus/ingestion-schema.ts src/corpus/ingestion.test.ts src/corpus/ingestion-schema.test.ts
```

- [ ] **Step 2: Grep for any remaining references**

```bash
grep -rln "from.*ingestion\"\|from.*ingestion-schema\"\|admin/new" app src --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v generated
```

Expected: only `app/admin/page.tsx` (the dashboard) should appear — that file is rewritten in Task 7, not this task. If anything else appears, stop and report it (NEEDS_CONTEXT) rather than guessing how to fix an unexpected caller.

- [ ] **Step 3: Confirm expected breakage, do not fix it here**

```bash
pnpm exec tsc --noEmit
```

Expected: errors in `app/admin/page.tsx` only (it imports the old `IngestionDraft` shape and calls `prisma.ingestionDraft.findMany` with old field names) — this is Task 7's job to fix, not this task's. Confirm no *other* file has errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Remove old single-flow ingestion code (app/admin/new, ingestion.ts, ingestion-schema.ts)"
```

Note in your report that `pnpm exec tsc --noEmit` is expected to be non-clean after this task (app/admin/page.tsx only) until Task 7 lands — this is intentional, not a task failure.

---

### Task 3: `src/corpus/ingestion-schema.ts` — extraction zod schema (source + place-mismatch)

**Files:**
- Create: `src/corpus/ingestion-schema.ts`
- Test: `src/corpus/ingestion-schema.test.ts`

**Interfaces:**
- Consumes: `ClaimTypeSchema`, `VerdictSchema`, `VerificationSchema`, `DecayClassSchema`, `SourceTypeSchema` (all from `src/corpus/schema.ts`), `ConditionSchema`, `AudienceSchema` (from `src/corpus/taxonomy.ts`) — reuse, do not redefine.
- Produces:
  ```ts
  export const DraftSourceSchema: z.ZodType<{
    type: SourceType;
    urlOrRef: string | null;
    dateCollected: string; // ISO date string from the model
    reliability: number; // 1-3
    notes: string | null;
  }>;

  export const DraftClaimSchema: z.ZodType<{
    claimText: string;
    claimType: ClaimType;
    conditions: Condition[];
    audience: Audience[];
    verdict: Verdict;
    verification: Verification;
    decayClass: DecayClass;
    sourceSnippet: string;
    reasoning: string | null;
    needsReview: boolean;
    placeMismatch: boolean; // NEW vs the old schema — replaces needsPlaceSelection
  }>;

  export const BlockExtractionResultSchema: z.ZodType<{
    source: DraftSource | null;
    claims: DraftClaim[];
  }>; // NOTE: no `place` field and no `needsPlaceSelection` — place is chosen
      // at capture (Surface 2, Task 5), not proposed by extraction. This is
      // the key structural difference from the old ExtractionResultSchema.

  export const BLOCK_EXTRACTION_JSON_SCHEMA = z.toJSONSchema(BlockExtractionResultSchema);
  ```

- [ ] **Step 1: Write the failing tests**

`src/corpus/ingestion-schema.test.ts` — model on the deleted old file's test structure (check `git show HEAD~2:src/corpus/ingestion-schema.test.ts` if you want the exact prior shape for reference, since it was deleted in Task 2, but do NOT restore its `place`/`needsPlaceSelection` assertions — this schema has neither). Cover:
- `DraftClaimSchema` rejects a claim with empty `conditions` when `decayClass !== "PERMANENT"` (same `.refine()` rule as before).
- `DraftClaimSchema` accepts empty `conditions` when `decayClass === "PERMANENT"`.
- `BlockExtractionResultSchema` accepts `source: null` (no source identifiable).
- `BlockExtractionResultSchema` accepts a `claims` array with `placeMismatch: true`.
- `DraftSourceSchema` requires `type` to be a valid `SourceType` enum value.

- [ ] **Step 2: Run tests, confirm failure**

```bash
pnpm exec vitest run src/corpus/ingestion-schema.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/corpus/ingestion-schema.ts`**

```ts
import { z } from "zod";
import {
  ClaimTypeSchema,
  VerdictSchema,
  VerificationSchema,
  DecayClassSchema,
  SourceTypeSchema,
} from "./schema";
import { ConditionSchema, AudienceSchema } from "./taxonomy";

export const DraftSourceSchema = z.object({
  type: SourceTypeSchema,
  urlOrRef: z.string().nullable(),
  dateCollected: z.string(),
  reliability: z.number().int().min(1).max(3),
  notes: z.string().nullable(),
});

const BaseDraftClaimSchema = z.object({
  claimText: z.string(),
  claimType: ClaimTypeSchema,
  conditions: z.array(ConditionSchema),
  audience: z.array(AudienceSchema),
  verdict: VerdictSchema,
  verification: VerificationSchema,
  decayClass: DecayClassSchema,
  sourceSnippet: z.string().min(1),
  reasoning: z.string().nullable(),
  needsReview: z.boolean(),
  placeMismatch: z.boolean(),
});

export const DraftClaimSchema = BaseDraftClaimSchema.refine(
  (claim) => claim.conditions.length > 0 || claim.decayClass === "PERMANENT",
  {
    message: "conditions must be non-empty unless decayClass is PERMANENT",
    path: ["conditions"],
  },
);

export const BlockExtractionResultSchema = z.object({
  source: DraftSourceSchema.nullable(),
  claims: z.array(DraftClaimSchema),
});

export type DraftSource = z.infer<typeof DraftSourceSchema>;
export type DraftClaim = z.infer<typeof DraftClaimSchema>;
export type BlockExtractionResult = z.infer<typeof BlockExtractionResultSchema>;

export const BLOCK_EXTRACTION_JSON_SCHEMA = z.toJSONSchema(BlockExtractionResultSchema);
```

**Known limitation, inherited from the prior plan's Task 3 finding (still true here, do not attempt to fix)**: `z.toJSONSchema()` silently drops `.refine()` predicates — the conditions/PERMANENT rule won't constrain Gemini's structured-output schema at generation time, only caught afterward by `.safeParse()`/`.parse()` at extraction time. Task 4's system prompt must state this rule explicitly in prose.

- [ ] **Step 4: Run tests, confirm pass**

```bash
pnpm exec vitest run src/corpus/ingestion-schema.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/corpus/ingestion-schema.ts src/corpus/ingestion-schema.test.ts
git commit -m "Add per-block extraction zod schema (source structuring, placeMismatch)"
```

---

### Task 4: `src/corpus/block-extraction.ts` — per-block Gemini orchestration

**Files:**
- Create: `src/corpus/block-extraction.ts`
- Test: `src/corpus/block-extraction.test.ts`

**Interfaces:**
- Consumes: `BlockExtractionResultSchema`, `BLOCK_EXTRACTION_JSON_SCHEMA` (Task 3), `CONDITIONS`/`AUDIENCES` (taxonomy), `SourceTypeSchema`'s enum values (taxonomy context for the prompt).
- Produces:
  ```ts
  export async function transcribeImage(data: Buffer, mimeType: string): Promise<string>;

  export async function extractBlock(input: {
    placeName: string;
    sourceHint?: string;
    sourceType?: string; // user-provided SourceType, if given at capture
    text?: string;
    transcript?: string;
  }): Promise<string>; // raw model output text, NOT yet parsed — mirrors the
                        // old extractFromText's contract: caller does
                        // JSON.parse + schema.parse, this function only calls Gemini.
  ```
  Note the narrower contract vs. the old `runIngestion`: this module does NOT write to Prisma and does NOT orchestrate multiple images/blocks — it does exactly one block's transcription + one block's extraction call. Task 5's server action owns the per-block loop, JSON parsing, schema validation, and all Prisma writes (draft/block creation, error handling) — keeping this module a pure Gemini-calling unit, testable in isolation.

- [ ] **Step 1: Write the failing tests**

`src/corpus/block-extraction.test.ts`, using the `vi.hoisted()` mock pattern for `GoogleGenAI` (see the deleted `src/corpus/ingestion.test.ts` at commit before Task 2's deletion — `git show <task-2-base-commit>:src/corpus/ingestion.test.ts` — for the exact working mock shape: `new GoogleGenAI()` requires a `function()` mock, not an arrow function, since it must be constructable). Cover:
- `transcribeImage` returns the model's `output_text` trimmed.
- `transcribeImage` returns the "aucun texte exploitable détecté" fallback when `output_text` is empty/whitespace.
- `extractBlock` calls `client.interactions.create` with `response_format` set to the `BLOCK_EXTRACTION_JSON_SCHEMA` (structured output, not raw-text parsing — same Gemini Interactions API mechanism the old file used, verified against live docs earlier this project; do not deviate from `response_format: { type: "text", mime_type: "application/json", schema: ... }`).
- `extractBlock` includes `placeName` in the prompt/input text (so the model has place context per spec 11's "each block's extraction call sees only that block's text and images plus the place name as context").
- `extractBlock` returns raw text without parsing it (caller's job).

- [ ] **Step 2: Run tests, confirm failure**

```bash
pnpm exec vitest run src/corpus/block-extraction.test.ts
```

- [ ] **Step 3: Implement `src/corpus/block-extraction.ts`**

Base the system instruction on the old (deleted) `EXTRACTION_SYSTEM_INSTRUCTION` in `src/corpus/ingestion.ts` (retrieve via `git show <task-2-base-commit>:src/corpus/ingestion.ts` for the exact French prose of rules 1–6, which are UNCHANGED) plus these additions/changes:

```ts
import { GoogleGenAI } from "@google/genai";
import { CONDITIONS, AUDIENCES } from "./taxonomy";
import { BLOCK_EXTRACTION_JSON_SCHEMA } from "./ingestion-schema";

const client = new GoogleGenAI({});
const MODEL = process.env.GEMINI_MODEL ?? "";

const EXTRACTION_SYSTEM_INSTRUCTION = `Tu extrais des affirmations ("claims") structurées à partir d'un texte de terrain, pour un carnet de lieux nature. Le lieu concerné est déjà déterminé — tu ne dois jamais en inventer un autre.

Règles non négociables :
1. Une claim ne mérite d'être extraite que si elle est falsifiable et précise (un chiffre, une heure, un lieu nommé, un seuil concret). Si le texte ne permet qu'une affirmation générique ("c'est fréquenté l'été"), n'émets AUCUNE claim — une généralité vaut moins qu'aucune claim.
2. Chaque claim doit avoir des "conditions" et une "audience" tirées de la taxonomie fournie, sauf si la claim est un fait permanent (topographie, exposition) — dans ce cas decayClass = PERMANENT et conditions peut être vide, mais tu dois le justifier explicitement dans le champ "reasoning".
3. Classe "verification" de façon conservatrice : un texte venant d'une source officielle (préfecture, mairie) → OFFICIAL. Un post Reddit/Instagram ou un texte de seconde main → LOCAL_TESTIMONY au maximum, jamais FIELD_VERIFIED (réservé aux visites personnelles de l'opérateur, jamais déduit par toi).
4. "sourceSnippet" est obligatoire pour chaque claim — la citation exacte ou le paraphrase proche du texte source qui justifie la claim.
5. "claimType" et "verdict" doivent venir uniquement des valeurs fixes fournies ; en cas d'ambiguïté réelle, utilise verdict = GO_IF et needsReview = true plutôt que de deviner GO ou AVOID.
6. Préfère sous-extraire. Il vaut mieux zéro claim depuis un texte faible qu'une claim plausible mais inventée. Ne remplis pas la sortie pour paraître exhaustif.
7. La vérification "FIELD_VERIFIED" ne peut être proposée que si la source déclarée est une visite personnelle (PERSONAL_VISIT). Dans tous les autres cas, le plafond est "OFFICIAL" (source écrite institutionnelle) ou "LOCAL_TESTIMONY".
8. Si une source est indiquée ou clairement déductible du texte, structure-la dans "source" (type tiré de la taxonomie fournie, dateCollected au format ISO, reliability de 1 à 3, notes optionnelles). Si aucune source n'est identifiable, renvoie source: null — ne l'invente jamais.
9. Le lieu concerné t'est donné : "\${placeName}". Si le texte concerne clairement un AUTRE lieu, n'attribue PAS silencieusement les claims au lieu donné — renvoie-les quand même mais avec placeMismatch: true, et nomme le lieu réel dans "reasoning".

Taxonomie disponible :
- conditions : \${CONDITIONS.join(", ")}
- audience : \${AUDIENCES.join(", ")}
- claimType : ACCESS, CROWDING, SUITABILITY, TIP, AVOID, ALTERNATIVE, DECODING
- verdict : GO, GO_IF, AVOID, ALTERNATIVE
- verification : FIELD_VERIFIED, OFFICIAL, LOCAL_TESTIMONY, HEURISTIC
- decayClass : PERMANENT, SEASONAL, ANNUAL_CHECK
- sourceType : OFFICIAL, PERSONAL_VISIT, LOCAL_PERSON, OT_CONVERSATION, REDDIT_LEAD, INSTAGRAM_LEAD, FACEBOOK_LEAD, PRESS_LEAD`;

export async function transcribeImage(
  data: Buffer,
  mimeType: string,
): Promise<string> {
  const interaction = await client.interactions.create({
    model: MODEL,
    input: [
      {
        type: "text",
        text: "Transcris ou décris tout texte pertinent visible sur cette image (panneau, document, capture d'écran). Réponds uniquement avec le texte pertinent, sans commentaire.",
      },
      {
        type: "image",
        data: data.toString("base64"),
        mime_type: mimeType,
      },
    ],
  });

  const text = interaction.output_text?.trim();
  return text && text.length > 0 ? text : "aucun texte exploitable détecté";
}

export async function extractBlock(input: {
  placeName: string;
  sourceHint?: string;
  sourceType?: string;
  text?: string;
  transcript?: string;
}): Promise<string> {
  const systemInstruction = EXTRACTION_SYSTEM_INSTRUCTION.replace(
    "${placeName}",
    input.placeName,
  );

  const parts = [
    input.sourceHint ? `Source déclarée : ${input.sourceHint}` : null,
    input.sourceType ? `Type de source déclaré : ${input.sourceType}` : null,
    input.text,
    input.transcript,
  ].filter(Boolean);

  const combinedText = parts.join("\n\n");

  const interaction = await client.interactions.create({
    model: MODEL,
    input: combinedText,
    system_instruction: systemInstruction,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: BLOCK_EXTRACTION_JSON_SCHEMA,
    },
  });

  return interaction.output_text ?? "";
}
```

(Rule text for 1–6 must be copied verbatim from the deleted file's git history, not rewritten from memory — the exact French phrasing encodes carefully-tuned extraction behavior from the prior plan.)

- [ ] **Step 4: Run tests, confirm pass**

```bash
pnpm exec vitest run src/corpus/block-extraction.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/corpus/block-extraction.ts src/corpus/block-extraction.test.ts
git commit -m "Add per-block Gemini extraction (transcribeImage, extractBlock) with source structuring and place-mismatch rules"
```

---

### Task 5: `/admin/places` — manual place CRUD (list + create/edit)

**Files:**
- Create: `src/corpus/queries.ts` addition (`getAllPlaces`, `getSignalZones`)
- Create: `app/admin/places/page.tsx` (list)
- Create: `app/admin/places/new/page.tsx` (create form)
- Create: `app/admin/places/[id]/page.tsx` (edit form)
- Create: `app/admin/places/actions.ts` (`createPlace`, `updatePlace`)
- Test: `app/admin/places/actions.test.ts`

**Interfaces:**
- Consumes: `Place`, `SignalZone`, `ZonePlace` (existing schema).
- Produces:
  ```ts
  // src/corpus/queries.ts additions
  export async function getAllPlaces(): Promise<Place[]>; // no status filter — used by both /admin/places list and /admin/ingest's picker
  export async function getSignalZones(): Promise<SignalZone[]>; // active: true, for the zone-assignment checkbox list

  // app/admin/places/actions.ts
  export async function createPlace(formData: FormData): Promise<void>; // redirects to /admin/places
  export async function updatePlace(placeId: string, formData: FormData): Promise<void>;
  ```

- [ ] **Step 1: Add `getAllPlaces` and `getSignalZones` to `src/corpus/queries.ts`**

```ts
export async function getAllPlaces(): Promise<Place[]> {
  return prisma.place.findMany({
    orderBy: { demandRank: "asc" },
  });
}

export async function getSignalZones(): Promise<SignalZone[]> {
  return prisma.signalZone.findMany({
    where: { active: true },
    orderBy: { label: "asc" },
  });
}
```

Add `SignalZone` to the existing type import from `../../prisma/generated/client` at the top of the file.

- [ ] **Step 2: Write failing tests for `queries.ts` additions**

Add to `src/corpus/queries.test.ts` (existing `vi.hoisted()` convention — extend the existing mock factory with `signalZone: { findMany: findManySignalZoneMock }`):

```ts
describe("getAllPlaces", () => {
  it("queries all places regardless of status, ordered by demandRank", async () => {
    findManyPlaceMock.mockResolvedValue([{ slug: "port-d-alon" }]);
    const result = await getAllPlaces();
    expect(findManyPlaceMock).toHaveBeenCalledWith({
      orderBy: { demandRank: "asc" },
    });
    expect(result).toEqual([{ slug: "port-d-alon" }]);
  });
});

describe("getSignalZones", () => {
  it("queries active signal zones ordered by label", async () => {
    findManySignalZoneMock.mockResolvedValue([{ label: "SAINTE BAUME" }]);
    const result = await getSignalZones();
    expect(findManySignalZoneMock).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { label: "asc" },
    });
    expect(result).toEqual([{ label: "SAINTE BAUME" }]);
  });
});
```

- [ ] **Step 3: Run tests, confirm failure, then implement, then confirm pass**

```bash
pnpm exec vitest run src/corpus/queries.test.ts
```

- [ ] **Step 4: Write `app/admin/places/actions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/src/corpus/db";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function readPlaceFields(formData: FormData) {
  const zoneIds = formData.getAll("zoneIds").filter((v): v is string => typeof v === "string");
  return {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? "") || slugify(String(formData.get("name") ?? "")),
    commune: String(formData.get("commune") ?? ""),
    departement: String(formData.get("departement") ?? ""),
    lat: Number(formData.get("lat")),
    lng: Number(formData.get("lng")),
    type: String(formData.get("type") ?? ""),
    governingAuthority: String(formData.get("governingAuthority") ?? "") || null,
    officialInfoUrl: String(formData.get("officialInfoUrl") ?? "") || null,
    description: String(formData.get("description") ?? "") || null,
    demandRank: Number(formData.get("demandRank") ?? 999),
    zapef: formData.get("zapef") === "on",
    status: String(formData.get("status") ?? "DRAFT"),
    zoneIds,
  };
}

export async function createPlace(formData: FormData): Promise<void> {
  const fields = readPlaceFields(formData);
  const place = await prisma.place.create({
    data: {
      name: fields.name,
      slug: fields.slug,
      commune: fields.commune,
      departement: fields.departement,
      lat: fields.lat,
      lng: fields.lng,
      type: fields.type as never,
      governingAuthority: fields.governingAuthority,
      officialInfoUrl: fields.officialInfoUrl,
      description: fields.description,
      demandRank: fields.demandRank,
      zapef: fields.zapef,
      status: fields.status as never,
    },
  });

  if (fields.zoneIds.length > 0) {
    await prisma.zonePlace.createMany({
      data: fields.zoneIds.map((signalZoneId) => ({ signalZoneId, placeId: place.id })),
    });
  }

  redirect("/admin/places");
}

export async function updatePlace(placeId: string, formData: FormData): Promise<void> {
  const fields = readPlaceFields(formData);
  await prisma.place.update({
    where: { id: placeId },
    data: {
      name: fields.name,
      slug: fields.slug,
      commune: fields.commune,
      departement: fields.departement,
      lat: fields.lat,
      lng: fields.lng,
      type: fields.type as never,
      governingAuthority: fields.governingAuthority,
      officialInfoUrl: fields.officialInfoUrl,
      description: fields.description,
      demandRank: fields.demandRank,
      zapef: fields.zapef,
      status: fields.status as never,
    },
  });

  await prisma.zonePlace.deleteMany({ where: { placeId } });
  if (fields.zoneIds.length > 0) {
    await prisma.zonePlace.createMany({
      data: fields.zoneIds.map((signalZoneId) => ({ signalZoneId, placeId })),
    });
  }

  redirect("/admin/places");
}
```

(The `as never` casts sidestep string-vs-enum friction consistent with how form fields are always plain strings; if `tsc --noEmit` flags a real mismatch after implementation, correct the cast to the specific Prisma enum type rather than widening further — do not use `as any`.)

- [ ] **Step 5: Write failing tests for the actions, then confirm pass after implementation**

`app/admin/places/actions.test.ts`, `vi.hoisted()` convention, covering: `createPlace` creates a `Place` then `ZonePlace` rows for each selected zone; `createPlace` with no zones selected skips the `zonePlace.createMany` call; `updatePlace` replaces zone assignments (delete-then-recreate, not merge).

- [ ] **Step 6: Write `app/admin/places/page.tsx` (list)**

Server component: `await connection()`, call `getAllPlaces()`, render a table (name, commune, département, status, demandRank, and a published-claim count — `prisma.claim.count({ where: { placeId, status: "PUBLISHED" } })` per place, or a single grouped query if you prefer, either is fine at this data volume). Each row links to `/admin/places/[id]`. A "Nouveau lieu" link to `/admin/places/new`.

- [ ] **Step 7: Write `app/admin/places/new/page.tsx` and `app/admin/places/[id]/page.tsx`**

Both render the same form shape (extract a shared `PlaceForm` component if that reduces duplication meaningfully — use your judgment, this is a small form, don't over-abstract for two call sites). Fields: name, slug (editable, pre-filled from name via a client-side small script IS out of scope — just a plain editable text input, auto-slugify only happens server-side on create if left blank per Step 4's `readPlaceFields`), commune, département (select: 13 | 83), lat, lng, type (select: `PlaceType` enum), governingAuthority, officialInfoUrl, description, demandRank, status (select: DRAFT | ACTIVE | RETIRED), zapef (checkbox), and a zone-assignment checkbox list from `getSignalZones()` (pre-checked based on the place's existing `ZonePlace` rows, for the edit page — call `prisma.zonePlace.findMany({ where: { placeId }, select: { signalZoneId: true } })` in `[id]/page.tsx`). The edit page's form posts to `updatePlace.bind(null, placeId)` (a bound server action, matching Next.js's documented pattern for passing extra arguments to a form action).

- [ ] **Step 8: Typecheck and run tests**

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run
```

- [ ] **Step 9: Commit**

```bash
git add src/corpus/queries.ts src/corpus/queries.test.ts app/admin/places
git commit -m "Add /admin/places manual place CRUD (list, create, edit, zone assignment)"
```

---

### Task 6: `/admin/ingest` — multi-source-block capture

**Files:**
- Create: `app/admin/ingest/page.tsx`
- Create: `app/admin/ingest/actions.ts` (`createCapture`, `addBlock`)
- Test: `app/admin/ingest/actions.test.ts`

**Interfaces:**
- Consumes: `getAllPlaces` (Task 5), `extractBlock`/`transcribeImage` (Task 4), `BlockExtractionResultSchema` (Task 3), `IngestionDraft`/`IngestionBlock` (Task 1).
- Produces:
  ```ts
  export async function createCapture(formData: FormData): Promise<void>; // redirects to /admin/review/[draftId]
  export async function addBlock(draftId: string, formData: FormData): Promise<void>; // redirects to /admin/review/[draftId]
  ```

- [ ] **Step 1: Write failing tests for `createCapture` and `addBlock`**

`app/admin/ingest/actions.test.ts`, `vi.hoisted()` convention mocking `prisma.ingestionDraft.create`, `prisma.ingestionBlock.create`, `prisma.place.findUnique`, and the `extractBlock`/`transcribeImage` module (mock `@/src/corpus/block-extraction`). Cover:
- `createCapture` with one text-only block: creates one `IngestionDraft` (status derived, starts `PENDING_REVIEW`) and one `IngestionBlock` with `order: 0`, calls `extractBlock` once with the place's name, writes `draftClaims`/`draftSource` from the parsed+validated result with each claim given a generated stable id and `resolution: "pending"`.
- `createCapture` with two blocks (one text, one image): creates two `IngestionBlock` rows (`order: 0`, `order: 1`), calls `extractBlock` independently for each — **assert the two calls have different `input` content**, proving no cross-block combination.
- `createCapture` where a block's extraction throws or returns malformed JSON: that block's `status` is set to `ERROR` with `rawModelOutput` populated; other blocks in the same draft are unaffected (still `PENDING_REVIEW` if they succeeded).
- `addBlock` appends a new `IngestionBlock` to an existing draft with the next `order` value (query existing blocks' max `order` + 1), running extraction the same way.

- [ ] **Step 2: Run tests, confirm failure**

```bash
pnpm exec vitest run app/admin/ingest/actions.test.ts
```

- [ ] **Step 3: Implement `app/admin/ingest/actions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto"; // Node's built-in, no new dependency —
                                          // used only for generating stable claim ids,
                                          // NOT for cuid()-style Prisma ids (those stay
                                          // Prisma's own default)
import { prisma } from "@/src/corpus/db";
import { extractBlock, transcribeImage } from "@/src/corpus/block-extraction";
import { BlockExtractionResultSchema } from "@/src/corpus/ingestion-schema";

async function runBlockExtraction(
  placeName: string,
  input: {
    sourceHint?: string;
    sourceType?: string;
    text?: string;
    images?: { data: Buffer; mimeType: string }[];
  },
): Promise<{
  status: "PENDING_REVIEW" | "ERROR";
  transcript: string | null;
  rawModelOutput: unknown;
  draftSource: unknown;
  draftClaims: unknown[];
}> {
  let transcript: string | undefined;
  let rawText: string | undefined;

  try {
    if (input.images && input.images.length > 0) {
      const transcripts = await Promise.all(
        input.images.map((img) => transcribeImage(img.data, img.mimeType)),
      );
      transcript = transcripts.join("\n\n");
    }

    rawText = await extractBlock({
      placeName,
      sourceHint: input.sourceHint,
      sourceType: input.sourceType,
      text: input.text,
      transcript,
    });

    const parsed = JSON.parse(rawText);
    const extraction = BlockExtractionResultSchema.parse(parsed);

    return {
      status: "PENDING_REVIEW",
      transcript: transcript ?? null,
      rawModelOutput: null,
      draftSource: extraction.source,
      draftClaims: extraction.claims.map((claim) => ({
        ...claim,
        id: randomUUID(),
        resolution: "pending" as const,
      })),
    };
  } catch (err) {
    return {
      status: "ERROR",
      transcript: transcript ?? null,
      rawModelOutput: {
        error: err instanceof Error ? err.message : String(err),
        ...(rawText !== undefined ? { rawOutput: rawText } : {}),
      },
      draftSource: null,
      draftClaims: [],
    };
  }
}

export async function createCapture(formData: FormData): Promise<void> {
  const placeId = String(formData.get("placeId") ?? "");
  const place = await prisma.place.findUniqueOrThrow({ where: { id: placeId } });

  const blockCount = Number(formData.get("blockCount") ?? 0);
  const draft = await prisma.ingestionDraft.create({
    data: { placeId, status: "PENDING_REVIEW" },
  });

  for (let i = 0; i < blockCount; i++) {
    const sourceHint = String(formData.get(`block-${i}-sourceHint`) ?? "") || undefined;
    const sourceType = String(formData.get(`block-${i}-sourceType`) ?? "") || undefined;
    const text = String(formData.get(`block-${i}-text`) ?? "") || undefined;
    const imageFiles = formData
      .getAll(`block-${i}-images`)
      .filter((f): f is File => f instanceof File && f.size > 0);
    const images = await Promise.all(
      imageFiles.map(async (file) => ({
        data: Buffer.from(await file.arrayBuffer()),
        mimeType: file.type || "application/octet-stream",
      })),
    );

    const result = await runBlockExtraction(place.name, {
      sourceHint,
      sourceType,
      text,
      images: images.length > 0 ? images : undefined,
    });

    await prisma.ingestionBlock.create({
      data: {
        draftId: draft.id,
        order: i,
        inputSourceHint: sourceHint ?? null,
        inputSourceType: sourceType ?? null,
        inputText: text ?? null,
        inputImages: images.map((img) => Uint8Array.from(img.data)),
        transcript: result.transcript,
        rawModelOutput: result.rawModelOutput ?? undefined,
        draftSource: result.draftSource ?? undefined,
        draftClaims: result.draftClaims,
        status: result.status,
      },
    });
  }

  redirect(`/admin/review/${draft.id}`);
}

export async function addBlock(draftId: string, formData: FormData): Promise<void> {
  const draft = await prisma.ingestionDraft.findUniqueOrThrow({
    where: { id: draftId },
    include: { place: true, blocks: { select: { order: true } } },
  });
  const nextOrder = draft.blocks.reduce((max, b) => Math.max(max, b.order), -1) + 1;

  const sourceHint = String(formData.get("sourceHint") ?? "") || undefined;
  const sourceType = String(formData.get("sourceType") ?? "") || undefined;
  const text = String(formData.get("text") ?? "") || undefined;
  const imageFiles = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const images = await Promise.all(
    imageFiles.map(async (file) => ({
      data: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "application/octet-stream",
    })),
  );

  const result = await runBlockExtraction(draft.place.name, {
    sourceHint,
    sourceType,
    text,
    images: images.length > 0 ? images : undefined,
  });

  await prisma.ingestionBlock.create({
    data: {
      draftId,
      order: nextOrder,
      inputSourceHint: sourceHint ?? null,
      inputSourceType: sourceType ?? null,
      inputText: text ?? null,
      inputImages: images.map((img) => Uint8Array.from(img.data)),
      transcript: result.transcript,
      rawModelOutput: result.rawModelOutput ?? undefined,
      draftSource: result.draftSource ?? undefined,
      draftClaims: result.draftClaims,
      status: result.status,
    },
  });

  redirect(`/admin/review/${draftId}`);
}
```

(`Uint8Array.from(img.data)` for `Bytes[]` writes — same pattern the prior ingestion-capture plan's final review fixed and verified byte-for-byte against a real database; do not write base64 strings or plain `Buffer`s here, per that established, hard-won fix.)

- [ ] **Step 4: Run tests, confirm pass**

```bash
pnpm exec vitest run app/admin/ingest/actions.test.ts
```

- [ ] **Step 5: Write `app/admin/ingest/page.tsx`**

Server component: `await connection()`, call `getAllPlaces()` for the place `<select>` (no free-text creation — a plain link `<a href="/admin/places/new" target="_blank">créer un lieu</a>` next to the select, per spec 11). A repeatable block section: start with one block (sourceHint textarea, sourceType select from `SourceTypeSchema`'s values — optional, blank = let the model infer — text textarea, images file input `multiple accept="image/*"`), with a client-side "Ajouter une source" mechanism. Since this project avoids client-side JS complexity where possible and Server Actions can't easily do dynamic array-length forms without a client component, use a **minimal client component** for just the repeatable-block-count state (a `"use client"` island wrapping just the "add block" button + block list, submitting through the same server action) — this is the one place in this plan that needs client interactivity; keep it as small and local as possible, do not convert the whole page to a client component. The form's hidden `blockCount` field (read by `createCapture`) reflects the current number of rendered blocks.

- [ ] **Step 6: Typecheck and run full suite**

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run
```

- [ ] **Step 7: Commit**

```bash
git add app/admin/ingest
git commit -m "Add /admin/ingest multi-source-block capture with per-block extraction"
```

---

### Task 7: `/admin/review/[draftId]` — per-block review, approve/reject, retry

**Files:**
- Create: `app/admin/review/[draftId]/page.tsx`
- Create: `app/admin/review/[draftId]/actions.ts` (`approveClaim`, `rejectClaim`, `retryExtraction`, `approveAllInBlock`, `rejectAllInBlock`)
- Test: `app/admin/review/[draftId]/actions.test.ts`

**Interfaces:**
- Consumes: `IngestionDraft`/`IngestionBlock` (Task 1), `extractBlock`/`transcribeImage` (Task 4, for retry), `DraftClaimSchema` (Task 3, for approval validation).
- Produces:
  ```ts
  export async function approveClaim(
    blockId: string,
    claimId: string,
    editedClaim: Record<string, unknown>,
    editedSource?: Record<string, unknown>,
  ): Promise<void>;
  export async function rejectClaim(blockId: string, claimId: string): Promise<void>;
  export async function retryExtraction(blockId: string): Promise<void>;
  export async function approveAllInBlock(blockId: string, editedClaims: Record<string, unknown>[]): Promise<void>;
  export async function rejectAllInBlock(blockId: string): Promise<void>;
  ```

- [ ] **Step 1: Write failing tests**

`app/admin/review/[draftId]/actions.test.ts`, `vi.hoisted()` convention. This is the highest-logic-density task in the plan — cover, at minimum:
- `approveClaim` creates a `Source` when the block has no `sourceId` yet, sets `IngestionBlock.sourceId`, creates the `Claim` (with `status: "PUBLISHED"` default, `isPublic: false` default, `placeId` from the draft's place, `sourceId` from the block), updates that claim's JSON entry to `resolution: "approved"` + `claimId`.
- A second `approveClaim` in the **same block** reuses the existing `sourceId` — does not call `prisma.source.create` again.
- `approveClaim` in a **different block of the same draft** creates its **own, separate** `Source` row — two blocks never share one.
- `approveClaim` rejects (throws or returns an error the caller must handle — pick one convention and be consistent, document it in the test) when `editedClaim.verification === "FIELD_VERIFIED"` but the block's `inputSourceType !== "PERSONAL_VISIT"` (the verification-ceiling rule enforced server-side).
- `approveClaim` rejects when the block has no `sourceId` yet and `editedSource` is incomplete/missing.
- Editing `editedSource` on a **second** approval in a block whose `sourceId` is already set **updates** that existing `Source` row (not creates a new one) — per spec 11's "editable until every claim in the block is resolved."
- `rejectClaim` only updates the draft claim's JSON `resolution: "rejected"` — asserts zero calls to `prisma.claim.create`/`prisma.source.create`.
- Rollup: approving/rejecting the last pending claim in a block sets `IngestionBlock.status = "RESOLVED"`; once all blocks in a draft are `RESOLVED`, `IngestionDraft.status` becomes `"APPROVED"` if ≥1 claim across the whole draft was approved, else `"REJECTED"`.
- `retryExtraction` re-runs extraction (mock `extractBlock`) and overwrites the block's `draftClaims`/`draftSource`/`rawModelOutput`/`status` on an untouched (`PENDING_REVIEW`) block.
- `retryExtraction` is **refused** (throws / returns an explicit error) when any claim in that block already has `resolution !== "pending"`.
- Actions resolve claims by their stable `id` field within the JSON array, not by array index — write a regression test that re-orders the `draftClaims` array in the mock and confirms the action still targets the claim with the matching `id`, not the claim at the same array position.

- [ ] **Step 2: Run tests, confirm failure**

```bash
pnpm exec vitest run "app/admin/review/[draftId]/actions.test.ts"
```

- [ ] **Step 3: Implement `app/admin/review/[draftId]/actions.ts`**

Key structure (fill in exact Prisma call shapes consistent with the test assertions you just wrote in Step 1 — this task's logic is dense enough that the tests you write are the more precise spec; this is a skeleton, not exact final code, unlike other tasks in this plan):

```ts
"use server";

import { prisma } from "@/src/corpus/db";

type DraftClaim = {
  id: string;
  resolution: "pending" | "approved" | "rejected";
  claimId?: string;
  [key: string]: unknown;
};

async function rollupBlockAndDraft(blockId: string): Promise<void> {
  const block = await prisma.ingestionBlock.findUniqueOrThrow({ where: { id: blockId } });
  const claims = block.draftClaims as DraftClaim[];
  const anyPending = claims.some((c) => c.resolution === "pending");

  if (!anyPending) {
    await prisma.ingestionBlock.update({
      where: { id: blockId },
      data: { status: "RESOLVED" },
    });

    const draft = await prisma.ingestionDraft.findUniqueOrThrow({
      where: { id: block.draftId },
      include: { blocks: true },
    });
    const allResolved = draft.blocks.every((b) =>
      b.id === blockId ? true : b.status === "RESOLVED",
    );

    if (allResolved) {
      const anyApprovedAnywhere = draft.blocks.some((b) =>
        (b.id === blockId ? claims : (b.draftClaims as DraftClaim[])).some(
          (c) => c.resolution === "approved",
        ),
      );
      await prisma.ingestionDraft.update({
        where: { id: draft.id },
        data: { status: anyApprovedAnywhere ? "APPROVED" : "REJECTED" },
      });
    }
  }
}

export async function approveClaim(
  blockId: string,
  claimId: string,
  editedClaim: Record<string, unknown>,
  editedSource?: Record<string, unknown>,
): Promise<void> {
  const block = await prisma.ingestionBlock.findUniqueOrThrow({
    where: { id: blockId },
    include: { draft: true },
  });

  // 1. Validate editedClaim (conditions non-empty unless PERMANENT; taxonomy values valid).
  // 2. Enforce verification ceiling: FIELD_VERIFIED only if block.inputSourceType === "PERSONAL_VISIT".
  // 3. Resolve/create/update the block's Source from editedSource.
  // 4. Create the Claim (placeId: block.draft.placeId, sourceId, status: "PUBLISHED" default, isPublic: false default).
  // 5. Update the matching claim (by id, not index) in block.draftClaims to resolution: "approved", claimId: <new claim id>.
  // 6. await rollupBlockAndDraft(blockId).
}

export async function rejectClaim(blockId: string, claimId: string): Promise<void> {
  // Update the matching claim (by id) to resolution: "rejected". await rollupBlockAndDraft(blockId).
}

export async function retryExtraction(blockId: string): Promise<void> {
  // Refuse if any claim's resolution !== "pending". Otherwise re-run extraction
  // from the block's stored inputSourceHint/inputSourceType/inputText/inputImages
  // (reuse the runBlockExtraction-equivalent logic from Task 6's actions.ts —
  // consider extracting it to a shared module both files import, rather than
  // duplicating it, since it's the same JSON.parse/schema.parse/error-handling
  // logic in both places).
}

export async function approveAllInBlock(
  blockId: string,
  editedClaims: Record<string, unknown>[],
): Promise<void> {
  // Loop editedClaims, calling the same per-claim logic approveClaim uses
  // (extract a shared internal function both approveClaim and this call,
  // to avoid the rollup running once per claim instead of once at the end —
  // or accept it running per-claim if that's simpler and still correct;
  // your call, but don't skip the rollup check after each one).
}

export async function rejectAllInBlock(blockId: string): Promise<void> {
  // Same shape as approveAllInBlock but calling rejectClaim's logic per pending claim.
}
```

**On the shared extraction logic between Task 6 and this task**: when implementing `retryExtraction`, if you find yourself duplicating `runBlockExtraction` from `app/admin/ingest/actions.ts`, move it to a shared location instead (e.g. `src/corpus/block-extraction.ts` itself, alongside `extractBlock`/`transcribeImage` from Task 4 — it's a natural fit there since it's the orchestration wrapper around those two primitives). Update Task 6's `actions.ts` to import it from there too rather than leaving two copies. Use your judgment on the exact shape; the important constraint is **no duplicated extraction-orchestration logic** between the two action files.

- [ ] **Step 4: Run tests, confirm pass**

```bash
pnpm exec vitest run "app/admin/review/[draftId]/actions.test.ts"
```

- [ ] **Step 5: Write `app/admin/review/[draftId]/page.tsx`**

Server component: `await connection()`, load the draft with all blocks (ordered by `order`), the place (name, commune, slug for a link to its `/admin/places/[id]` edit page). Header shows place info, capture date, and a per-block progress summary (count of sources, count of claims, count still pending — computed by summing each block's `draftClaims` array). Then one section per block, in `order`:
- Block header: raw `inputSourceHint` verbatim, block `status`.
- If `status === "ERROR"`: raw `rawModelOutput` shown, a "Réessayer l'extraction" button (form posting to `retryExtraction.bind(null, block.id)`).
- Otherwise: left column — `inputText`, each `inputImages[i]` as an inline base64 `<img>`, `transcript` if present. Right column, top — source card (editable fields from `draftSource`, or empty+required if null; read-only display once the block has a `sourceId` AND has zero pending claims remaining — per spec 11, "editable until every claim in the block is resolved," so it stays editable even after `sourceId` is set, as long as ≥1 claim in that block is still pending). Right column, below — one card per draft claim: `sourceSnippet` under editable `claimText`, editable claimType/conditions/audience/verdict/verification/decayClass/`verifiedOn`/`isPublic`, read-only `reasoning` + badges for `needsReview`/`placeMismatch` when true, Approve/Reject buttons each an independent form (`approveClaim.bind(null, block.id, claim.id)` / `rejectClaim.bind(null, block.id, claim.id)`). Resolved cards (approved or rejected) render read-only, greyed if rejected; approved cards should ideally re-read from the created `Claim` row rather than the stale draft JSON (per spec 11's "render from that row" note) — if that adds meaningful complexity, rendering from the draft JSON's post-approval snapshot is an acceptable simplification for this task; note which you chose in your report.
- Block actions: "Tout approuver" / "Tout rejeter" for that block's pending claims, visible only if ≥1 claim is pending.
- Also render the static quality-bar text from spec 11 ("Assez précis pour être vérifiable...") beside the claim cards, always visible.
- Footer: "Ajouter une source à cette capture" — a small form (reuse the client-island pattern from Task 6 if a multi-field add-block form is needed here too, or keep it simpler if a single new block's fields fit without needing dynamic repetition) posting to `addBlock.bind(null, draft.id)` from Task 6's action.

- [ ] **Step 6: Typecheck and run full suite**

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run
```

- [ ] **Step 7: Commit**

```bash
git add app/admin/review src/corpus/block-extraction.ts app/admin/ingest/actions.ts
git commit -m "Add /admin/review/[draftId] per-block review with approve/reject/retry"
```

---

### Task 8: Rewrite `/admin` dashboard for the new place-scoped draft model

**Files:**
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `IngestionDraft` with `place` and `blocks` relations (Task 1).
- Produces: no new exports — this is a leaf page.

- [ ] **Step 1: Rewrite `app/admin/page.tsx`**

Replace the flat `draftPreview`/`DraftSection` logic (which reads `draft.inputText`/`draft.inputImages` directly — fields that no longer exist on `IngestionDraft`) with a place-scoped preview: query `prisma.ingestionDraft.findMany({ orderBy: { createdAt: "desc" }, include: { place: { select: { name: true, slug: true } }, blocks: { select: { status: true, draftClaims: true } } } })`, group by `status` the same way as before (`PENDING_REVIEW`, `ERROR`, `APPROVED`, `REJECTED`), and render each draft's preview as the place name + a per-block-count summary (e.g. "3 sources · 5 revendications") instead of the old raw-text snippet, linking each row to `/admin/review/[draftId]`.

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: fully clean project-wide — this is the last file with a known-outstanding error from Task 2's deletion.

- [ ] **Step 3: Run full suite**

```bash
pnpm exec vitest run
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/page.tsx
git commit -m "Rewrite /admin dashboard for place-scoped IngestionDraft/IngestionBlock model"
```

---

### Task 9: Whole-branch review checklist (for the final reviewer, not a task to implement)

Before finishing this plan, the final whole-branch review should specifically verify:

- No remaining references anywhere in `app/`, `src/`, or test files to the deleted old ingestion module (`grep -rn "from.*[\"']@/src/corpus/ingestion[\"']\|from.*[\"']\\./ingestion[\"']" app src`, excluding `block-extraction.ts`/`ingestion-schema.ts` which are new, differently-named files) — `pnpm exec tsc --noEmit` fully clean is the strongest signal here.
- `prisma/generated` reflects the Task 1 migration (recurring failure mode in this project's history — check every time, don't assume).
- The verification-ceiling rule (`FIELD_VERIFIED` only for `PERSONAL_VISIT`) has an actual enforced test, not just a prompt instruction — this is a server-side data-integrity rule, not merely an extraction-quality nicety.
- Stable-id claim resolution (never array index) has an actual regression test proving it survives reordering, not just correct-by-construction code.
- No cross-block claim attribution anywhere — grep the extraction code path for anything that would let one block's `extractBlock` call see another block's `inputText`/`inputImages`/`transcript`.
- `Uint8Array.from(img.data)` (not base64 strings, not plain `Buffer`) is used at every `inputImages` write site across both `app/admin/ingest/actions.ts` and any retry path in `app/admin/review/[draftId]/actions.ts` — this exact class of bug was the Critical finding in the prior single-flow ingestion plan's final review; confirm it wasn't reintroduced.
- `Source` row reuse-vs-create-new logic is correct at both the "same block, second approval" and "different block, same draft" boundaries — these are easy to get backwards.
