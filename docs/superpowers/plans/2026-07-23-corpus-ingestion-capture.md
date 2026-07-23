# Corpus Ingestion Capture + Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/admin/new` (capture form) and the Gemini extraction pipeline that turns pasted text and/or uploaded images into `IngestionDraft` rows — step (B) of the 4-step corpus-ingestion tool. No review/approve UI yet; verification is via the existing `/admin` dashboard.

**Architecture:** A capture form posts to a server action in `src/corpus/ingestion.ts`. The action transcribes any images via Gemini's Interactions API (multimodal), then runs one structured-extraction call against combined text, validated with a hand-written zod schema (JSON Schema for Gemini's `response_format` is derived from the same zod schema via `z.toJSONSchema()` — single source of truth, no experimental JSON-Schema-to-Zod conversion). Success or failure both write an `IngestionDraft` row; the action redirects to `/admin`.

**Tech Stack:** Next.js 16.2.10 (App Router, Server Actions), TypeScript, `@google/genai` (Interactions API), zod 4.4.3, Prisma 7.9.0 (existing schema, one migration).

## Global Constraints

- `IngestionDraft.inputImages` changes from `String[]` to `Bytes[]` — images are stored as bytes directly in Postgres, no object storage (`10-corpus-ingestion.md`'s "Image storage" section).
- Gemini model name is read from `process.env.GEMINI_MODEL`, never hardcoded in source (model versions move fast; this is an operator-set env var).
- Extraction prompt must encode all 7 non-negotiable rules from `10-corpus-ingestion.md` verbatim: falsifiable-only extraction, taxonomy-constrained `conditions`/`audience` unless `decayClass = PERMANENT`, conservative `verification` classification (never `FIELD_VERIFIED` from the model), mandatory `sourceSnippet` per claim, fixed enum values only, prefer under-extraction over invention, never invent a `Place` (emit `place: null` + `needsPlaceSelection: true` if ambiguous).
- A claim without `sourceSnippet` must be rejected by the zod validator before it can reach `draftClaims` — this is a hard validation failure, not a warning.
- Any failure path (API error, malformed JSON, zod validation failure) writes `IngestionDraft` with `status: ERROR` and `rawModelOutput` populated — never silently drops the capture.
- Blurry/unusable image transcription writes `"aucun texte exploitable détecté"` into that image's transcript contribution, not a blank string.
- Extraction runs synchronously in the server action (per spec's stated flow: submit → extraction → redirect) — no background job queue.
- Out of scope: `/admin/review/[draftId]`, any write of real `Place`/`Claim` rows, `pnpm corpus:sync-seed-files`, image retention cleanup (happens at approval time, a later step).

---

## File Structure

```
prisma/schema.prisma              # IngestionDraft.inputImages: String[] -> Bytes[]
.env.dist                         # + GEMINI_API_KEY, GEMINI_MODEL
src/corpus/ingestion-schema.ts    # zod schema for extraction output (DraftPlace/DraftClaim)
src/corpus/ingestion-schema.test.ts
src/corpus/ingestion.ts           # Gemini calls + orchestration (transcribe, extract, validate, write)
src/corpus/ingestion.test.ts
app/admin/new/page.tsx            # capture form
app/admin/new/actions.ts          # the server action ("use server"), thin wrapper calling ingestion.ts
```

Rationale: `ingestion-schema.ts` (pure zod, no I/O) is separated from `ingestion.ts` (the actual Gemini/Prisma calls) so the schema/prompt-construction logic is unit-testable without mocking the network. `app/admin/new/actions.ts` stays a thin server-action wrapper — the real logic lives in `src/corpus/`, matching this codebase's existing split between `src/corpus/` (domain logic) and `app/` (routes).

---

## Task 1: `IngestionDraft.inputImages` migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `IngestionDraft.inputImages: Bytes[]` in the generated Prisma client. Consumed by Task 4 (`ingestion.ts`'s DB write) and Task 5 (server action's file handling, indirectly).

- [ ] **Step 1: Change the field type**

In `prisma/schema.prisma`, find the `IngestionDraft` model and change:

```prisma
  inputImages    String[]
```

to:

```prisma
  inputImages    Bytes[]
```

- [ ] **Step 2: Validate and migrate**

Run: `pnpm exec prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

Run: `pnpm exec prisma migrate dev --name ingestion_draft_images_bytes`
Expected: creates a new migration, applies to Neon, regenerates the client. Since the existing `IngestionDraft` table has zero rows (no capture flow has ever run), this is a safe, lossless type change — no data migration concern.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. If `app/admin/page.tsx`'s `draftPreview` function (which checks `draft.inputImages.length > 0`) still compiles cleanly, that confirms the array-length check is type-agnostic and unaffected by the `String[]` → `Bytes[]` change.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Change IngestionDraft.inputImages to Bytes[] (stored in Postgres, no object storage)"
```

---

## Task 2: Gemini env vars + dependency

**Files:**
- Modify: `.env.dist`
- Modify: `package.json` (via `pnpm add`)

**Interfaces:**
- Produces: `process.env.GEMINI_API_KEY`, `process.env.GEMINI_MODEL`, and the `@google/genai` package. Consumed by Task 4 (`ingestion.ts`).

- [ ] **Step 1: Install the SDK**

Run: `pnpm add @google/genai`
Expected: added to `dependencies` in `package.json`.

- [ ] **Step 2: Add env vars to `.env.dist`**

Append:

```
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=<gemini-model-name-e.g.-gemini-3.6-flash>
```

- [ ] **Step 3: Add real values to `.env.local`**

You (the plan owner) must supply a real `GEMINI_API_KEY` — this cannot be generated like the `ADMIN_PASSWORD`/`REVALIDATE_TOKEN` secrets were. If implementing via subagent, the subagent should ask you for this value rather than proceeding with a placeholder, since extraction cannot be verified without a working key. Append to `.env.local`:

```
GEMINI_API_KEY=<real key, supplied by the plan owner>
GEMINI_MODEL=<real model name, supplied by the plan owner>
```

- [ ] **Step 4: Commit**

```bash
git add .env.dist package.json pnpm-lock.yaml
git commit -m "Add @google/genai dependency and Gemini env vars"
```

(`.env.local`'s new lines are gitignored, not committed.)

---

## Task 3: `ingestion-schema.ts` — zod schema for extraction output

**Files:**
- Create: `src/corpus/ingestion-schema.ts`
- Create: `src/corpus/ingestion-schema.test.ts`

**Interfaces:**
- Consumes: `ClaimTypeSchema`, `VerdictSchema`, `VerificationSchema`, `DecayClassSchema` (existing, from `src/corpus/schema.ts`), `ConditionSchema`, `AudienceSchema` (existing, from `src/corpus/taxonomy.ts`).
- Produces: `DraftPlaceSchema`, `DraftClaimSchema`, `ExtractionResultSchema` (zod schemas), their inferred TypeScript types (`DraftPlace`, `DraftClaim`, `ExtractionResult`), and `EXTRACTION_JSON_SCHEMA` (the JSON Schema derived via `z.toJSONSchema(ExtractionResultSchema)`, for Gemini's `response_format`). Consumed by Task 4 (`ingestion.ts`).

This task has no I/O — build and test it standalone first, following this codebase's existing TDD pattern in `src/corpus/schema.test.ts`.

- [ ] **Step 1: Write the failing test for a valid extraction result**

Create `src/corpus/ingestion-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ExtractionResultSchema } from "./ingestion-schema";

describe("ExtractionResultSchema", () => {
  it("accepts a valid result with a place and one well-formed claim", () => {
    const result = ExtractionResultSchema.safeParse({
      place: null,
      claims: [
        {
          claimText: "Le parking est plein dès 9h30 le dimanche en été.",
          claimType: "TIP",
          conditions: ["ete", "dimanche"],
          audience: ["tous"],
          verdict: "GO_IF",
          verification: "LOCAL_TESTIMONY",
          decayClass: "SEASONAL",
          sourceSnippet: "le parking est plein dès 9h30",
          reasoning: null,
          needsReview: false,
        },
      ],
      needsPlaceSelection: false,
    });

    expect(result.success).toBe(true);
  });

  it("rejects a claim missing sourceSnippet", () => {
    const result = ExtractionResultSchema.safeParse({
      place: null,
      claims: [
        {
          claimText: "Le parking est plein dès 9h30 le dimanche en été.",
          claimType: "TIP",
          conditions: ["ete", "dimanche"],
          audience: ["tous"],
          verdict: "GO_IF",
          verification: "LOCAL_TESTIMONY",
          decayClass: "SEASONAL",
          reasoning: null,
          needsReview: false,
        },
      ],
      needsPlaceSelection: false,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a claim with empty conditions when decayClass is not PERMANENT", () => {
    const result = ExtractionResultSchema.safeParse({
      place: null,
      claims: [
        {
          claimText: "Le parking est plein dès 9h30 le dimanche en été.",
          claimType: "TIP",
          conditions: [],
          audience: ["tous"],
          verdict: "GO_IF",
          verification: "LOCAL_TESTIMONY",
          decayClass: "SEASONAL",
          sourceSnippet: "le parking est plein dès 9h30",
          reasoning: null,
          needsReview: false,
        },
      ],
      needsPlaceSelection: false,
    });

    expect(result.success).toBe(false);
  });

  it("allows empty conditions when decayClass is PERMANENT, given a reasoning", () => {
    const result = ExtractionResultSchema.safeParse({
      place: null,
      claims: [
        {
          claimText: "L'accès se fait uniquement à pied depuis le parking du col.",
          claimType: "ACCESS",
          conditions: [],
          audience: ["tous"],
          verdict: "GO",
          verification: "OFFICIAL",
          decayClass: "PERMANENT",
          sourceSnippet: "accès uniquement à pied",
          reasoning: "Topographie du site, fait permanent.",
          needsReview: false,
        },
      ],
      needsPlaceSelection: false,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an unknown condition value not in the fixed taxonomy", () => {
    const result = ExtractionResultSchema.safeParse({
      place: null,
      claims: [
        {
          claimText: "Test.",
          claimType: "TIP",
          conditions: ["not-a-real-condition"],
          audience: ["tous"],
          verdict: "GO",
          verification: "OFFICIAL",
          decayClass: "SEASONAL",
          sourceSnippet: "test",
          reasoning: null,
          needsReview: false,
        },
      ],
      needsPlaceSelection: false,
    });

    expect(result.success).toBe(false);
  });

  it("accepts an empty claims array (under-extraction is valid, not an error)", () => {
    const result = ExtractionResultSchema.safeParse({
      place: null,
      claims: [],
      needsPlaceSelection: false,
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run src/corpus/ingestion-schema.test.ts`
Expected: FAIL — `Cannot find module './ingestion-schema'`.

- [ ] **Step 3: Implement `src/corpus/ingestion-schema.ts`**

```ts
import { z } from "zod";
import {
  ClaimTypeSchema,
  VerdictSchema,
  VerificationSchema,
  DecayClassSchema,
} from "./schema";
import { ConditionSchema, AudienceSchema } from "./taxonomy";

export const DraftPlaceSchema = z.object({
  name: z.string(),
  commune: z.string(),
  departement: z.enum(["13", "83"]),
  type: z.enum(["CALANQUE", "PLAGE", "MASSIF", "SENTIER", "SOMMET", "SITE"]),
  description: z.string().optional(),
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
});

export const DraftClaimSchema = BaseDraftClaimSchema.refine(
  (claim) => claim.conditions.length > 0 || claim.decayClass === "PERMANENT",
  {
    message: "conditions must be non-empty unless decayClass is PERMANENT",
    path: ["conditions"],
  },
);

export const ExtractionResultSchema = z.object({
  place: DraftPlaceSchema.nullable(),
  claims: z.array(DraftClaimSchema),
  needsPlaceSelection: z.boolean(),
});

export type DraftPlace = z.infer<typeof DraftPlaceSchema>;
export type DraftClaim = z.infer<typeof DraftClaimSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

export const EXTRACTION_JSON_SCHEMA = z.toJSONSchema(ExtractionResultSchema);
```

- [ ] **Step 4: Run to verify all pass**

Run: `pnpm exec vitest run src/corpus/ingestion-schema.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Verify `EXTRACTION_JSON_SCHEMA` is actually usable**

Run a quick manual check that `z.toJSONSchema` produces a plain object (not throwing, not a class instance) — this confirms the JSON Schema can be safely passed into Gemini's `response_format.schema` in Task 4:

```bash
pnpm exec tsx -e "
async function main() {
  const { EXTRACTION_JSON_SCHEMA } = await import('./src/corpus/ingestion-schema.ts');
  console.log(JSON.stringify(EXTRACTION_JSON_SCHEMA, null, 2).slice(0, 300));
}
main();
" 2>&1 || echo "NOTE: if this fails due to the project's CJS/ESM top-level-await quirk (package.json has no type:module), write a throwaway .ts file wrapping this in an async main() and run it with tsx instead of -e."
```
Expected: prints a JSON Schema object with `"type": "object"`, `"properties"`, etc. — confirms `z.toJSONSchema()` works as expected in this project's zod version.

- [ ] **Step 6: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/corpus/ingestion-schema.ts src/corpus/ingestion-schema.test.ts
git commit -m "Add zod schema for Gemini extraction output"
```

---

## Task 4: `ingestion.ts` — Gemini calls + orchestration

**Files:**
- Create: `src/corpus/ingestion.ts`
- Create: `src/corpus/ingestion.test.ts`

**Interfaces:**
- Consumes: `ExtractionResultSchema`, `EXTRACTION_JSON_SCHEMA` (Task 3); `prisma` (existing, `src/corpus/db.ts`); `CONDITIONS`, `AUDIENCES` (existing, `src/corpus/taxonomy.ts`); `@google/genai`'s `GoogleGenAI` client (Task 2).
- Produces: `transcribeImage(data: Buffer, mimeType: string): Promise<string>` (exported, used directly by tests) and `runIngestion(input: { text?: string; images?: { data: Buffer; mimeType: string }[]; placeSlug?: string }): Promise<IngestionDraft>` (the exported top-level orchestrator — transcribes images, extracts, validates, writes the draft row, returns it). `extractFromText` is an internal, unexported helper used only inside `runIngestion` — not part of this module's public interface. Consumed by Task 5 (`app/admin/new/actions.ts`).

This task involves real network calls to Gemini — tests use a mocked client (matching this codebase's existing `vi.hoisted()` mock pattern from `src/corpus/queries.test.ts`), not live API calls, so the test suite doesn't require a real `GEMINI_API_KEY` to run.

- [ ] **Step 1: Write the failing tests**

Create `src/corpus/ingestion.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { createMock, createDraftMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  createDraftMock: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    interactions: { create: createMock },
  })),
}));

vi.mock("./db", () => ({
  prisma: {
    ingestionDraft: { create: createDraftMock },
  },
}));

import { runIngestion } from "./ingestion";

beforeEach(() => {
  createMock.mockReset();
  createDraftMock.mockReset();
});

describe("runIngestion", () => {
  it("writes a PENDING_REVIEW draft on a successful text-only extraction", async () => {
    createMock.mockResolvedValueOnce({
      output_text: JSON.stringify({
        place: null,
        claims: [],
        needsPlaceSelection: false,
      }),
    });
    createDraftMock.mockResolvedValueOnce({ id: "draft-1", status: "PENDING_REVIEW" });

    const result = await runIngestion({ text: "Une observation de terrain." });

    expect(createDraftMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING_REVIEW",
        inputText: "Une observation de terrain.",
        draftClaims: [],
      }),
    });
    expect(result.status).toBe("PENDING_REVIEW");
  });

  it("writes an ERROR draft when the model returns malformed JSON", async () => {
    createMock.mockResolvedValueOnce({ output_text: "not valid json {{{" });
    createDraftMock.mockResolvedValueOnce({ id: "draft-2", status: "ERROR" });

    const result = await runIngestion({ text: "Une observation de terrain." });

    expect(createDraftMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "ERROR",
        rawModelOutput: expect.anything(),
      }),
    });
    expect(result.status).toBe("ERROR");
  });

  it("writes an ERROR draft when the model output fails zod validation", async () => {
    createMock.mockResolvedValueOnce({
      output_text: JSON.stringify({
        place: null,
        claims: [{ claimText: "no sourceSnippet or other required fields" }],
        needsPlaceSelection: false,
      }),
    });
    createDraftMock.mockResolvedValueOnce({ id: "draft-3", status: "ERROR" });

    const result = await runIngestion({ text: "Une observation de terrain." });

    expect(createDraftMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "ERROR" }),
    });
    expect(result.status).toBe("ERROR");
  });

  it("writes an ERROR draft when the Gemini API call throws", async () => {
    createMock.mockRejectedValueOnce(new Error("network timeout"));
    createDraftMock.mockResolvedValueOnce({ id: "draft-4", status: "ERROR" });

    const result = await runIngestion({ text: "Une observation de terrain." });

    expect(createDraftMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "ERROR",
        rawModelOutput: expect.objectContaining({ error: expect.stringContaining("network timeout") }),
      }),
    });
    expect(result.status).toBe("ERROR");
  });

  it("concatenates image transcripts and includes them in the extraction input", async () => {
    createMock
      .mockResolvedValueOnce({ output_text: "Panneau : accès interdit après 20h." })
      .mockResolvedValueOnce({
        output_text: JSON.stringify({
          place: null,
          claims: [],
          needsPlaceSelection: false,
        }),
      });
    createDraftMock.mockResolvedValueOnce({ id: "draft-5", status: "PENDING_REVIEW" });

    await runIngestion({
      images: [{ data: Buffer.from("fake-image-bytes"), mimeType: "image/jpeg" }],
    });

    expect(createDraftMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transcript: expect.stringContaining("Panneau : accès interdit après 20h."),
      }),
    });
  });

  it("writes 'aucun texte exploitable détecté' when image transcription is empty", async () => {
    createMock
      .mockResolvedValueOnce({ output_text: "" })
      .mockResolvedValueOnce({
        output_text: JSON.stringify({
          place: null,
          claims: [],
          needsPlaceSelection: false,
        }),
      });
    createDraftMock.mockResolvedValueOnce({ id: "draft-6", status: "PENDING_REVIEW" });

    await runIngestion({
      images: [{ data: Buffer.from("fake-blurry-image"), mimeType: "image/jpeg" }],
    });

    expect(createDraftMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transcript: expect.stringContaining("aucun texte exploitable détecté"),
      }),
    });
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm exec vitest run src/corpus/ingestion.test.ts`
Expected: FAIL — `Cannot find module './ingestion'`.

- [ ] **Step 3: Implement `src/corpus/ingestion.ts`**

```ts
import { GoogleGenAI } from "@google/genai";
import { prisma } from "./db";
import { CONDITIONS, AUDIENCES } from "./taxonomy";
import { ExtractionResultSchema, EXTRACTION_JSON_SCHEMA } from "./ingestion-schema";
import type { IngestionDraft } from "../../prisma/generated/client";

const client = new GoogleGenAI({});
const MODEL = process.env.GEMINI_MODEL ?? "";

const EXTRACTION_SYSTEM_INSTRUCTION = `Tu extrais des affirmations ("claims") structurées à partir d'un texte de terrain, pour un carnet de lieux nature.

Règles non négociables :
1. Une claim ne mérite d'être extraite que si elle est falsifiable et précise (un chiffre, une heure, un lieu nommé, un seuil concret). Si le texte ne permet qu'une affirmation générique ("c'est fréquenté l'été"), n'émets AUCUNE claim — une généralité vaut moins qu'aucune claim.
2. Chaque claim doit avoir des "conditions" et une "audience" tirées de la taxonomie fournie, sauf si la claim est un fait permanent (topographie, exposition) — dans ce cas decayClass = PERMANENT et conditions peut être vide, mais tu dois le justifier explicitement dans le champ "reasoning".
3. Classe "verification" de façon conservatrice : un texte venant d'une source officielle (préfecture, mairie) → OFFICIAL. Un post Reddit/Instagram ou un texte de seconde main → LOCAL_TESTIMONY au maximum, jamais FIELD_VERIFIED (réservé aux visites personnelles de l'opérateur, jamais déduit par toi).
4. "sourceSnippet" est obligatoire pour chaque claim — la citation exacte ou le paraphrase proche du texte source qui justifie la claim.
5. "claimType" et "verdict" doivent venir uniquement des valeurs fixes fournies ; en cas d'ambiguïté réelle, utilise verdict = GO_IF et needsReview = true plutôt que de deviner GO ou AVOID.
6. Préfère sous-extraire. Il vaut mieux zéro claim depuis un texte faible qu'une claim plausible mais inventée. Ne remplis pas la sortie pour paraître exhaustif.
7. N'invente jamais de lieu si le texte est ambigu sur le lieu concerné — renvoie place: null et needsPlaceSelection: true.

Taxonomie disponible :
- conditions : ${CONDITIONS.join(", ")}
- audience : ${AUDIENCES.join(", ")}
- claimType : ACCESS, CROWDING, SUITABILITY, TIP, AVOID, ALTERNATIVE, DECODING
- verdict : GO, GO_IF, AVOID, ALTERNATIVE
- verification : FIELD_VERIFIED, OFFICIAL, LOCAL_TESTIMONY, HEURISTIC
- decayClass : PERMANENT, SEASONAL, ANNUAL_CHECK`;

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

async function extractFromText(combinedText: string) {
  const interaction = await client.interactions.create({
    model: MODEL,
    input: combinedText,
    system_instruction: EXTRACTION_SYSTEM_INSTRUCTION,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: EXTRACTION_JSON_SCHEMA,
    },
  });

  const parsed = JSON.parse(interaction.output_text ?? "");
  return ExtractionResultSchema.parse(parsed);
}

export async function runIngestion(input: {
  text?: string;
  images?: { data: Buffer; mimeType: string }[];
  placeSlug?: string;
}): Promise<IngestionDraft> {
  let transcript: string | undefined;

  try {
    if (input.images && input.images.length > 0) {
      const transcripts = await Promise.all(
        input.images.map((img) => transcribeImage(img.data, img.mimeType)),
      );
      transcript = transcripts.join("\n\n");
    }

    const combinedText = [input.text, transcript].filter(Boolean).join("\n\n");
    const extraction = await extractFromText(combinedText);

    return prisma.ingestionDraft.create({
      data: {
        inputText: input.text ?? null,
        inputImages: input.images?.map((img) => img.data) ?? [],
        transcript: transcript ?? null,
        status: "PENDING_REVIEW",
        draftPlace: extraction.place,
        draftClaims: extraction.claims,
      },
    });
  } catch (err) {
    return prisma.ingestionDraft.create({
      data: {
        inputText: input.text ?? null,
        inputImages: input.images?.map((img) => img.data) ?? [],
        transcript: transcript ?? null,
        status: "ERROR",
        rawModelOutput: {
          error: err instanceof Error ? err.message : String(err),
        },
        draftClaims: [],
      },
    });
  }
}
```

Note: the malformed-JSON and zod-validation-failure test cases (Steps in the test file above) are both caught by the same `try`/`catch` around `extractFromText` — `JSON.parse` throws on malformed JSON, `ExtractionResultSchema.parse` (not `safeParse`) throws on validation failure. Both land in the `catch` block and produce an `ERROR` draft. This is deliberate: use `.parse()` (throwing), not `.safeParse()`, inside `extractFromText` so both failure modes funnel through one error path.

- [ ] **Step 4: Run to verify all pass**

Run: `pnpm exec vitest run src/corpus/ingestion.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. If `@google/genai`'s TypeScript types for `interactions.create`'s `input`/`response_format`/`system_instruction` parameters don't match exactly what's used here (the SDK's exact type names may differ slightly from the doc examples), adjust to match the installed package's actual type definitions — check `node_modules/@google/genai`'s `.d.ts` files for the authoritative shape rather than guessing.

- [ ] **Step 6: Commit**

```bash
git add src/corpus/ingestion.ts src/corpus/ingestion.test.ts
git commit -m "Add Gemini extraction orchestration (transcribe, extract, validate, write draft)"
```

---

## Task 5: `app/admin/new/actions.ts` — server action

**Files:**
- Create: `app/admin/new/actions.ts`

**Interfaces:**
- Consumes: `runIngestion` (Task 4).
- Produces: `submitCapture(formData: FormData): Promise<void>` (a `"use server"` action). Consumed by Task 6 (the capture form).

- [ ] **Step 1: Write `app/admin/new/actions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import { runIngestion } from "@/src/corpus/ingestion";

export async function submitCapture(formData: FormData): Promise<void> {
  const text = formData.get("text");
  const placeSlug = formData.get("placeSlug");
  const imageFiles = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const images = await Promise.all(
    imageFiles.map(async (file) => ({
      data: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "application/octet-stream",
    })),
  );

  await runIngestion({
    text: typeof text === "string" && text.trim().length > 0 ? text.trim() : undefined,
    images: images.length > 0 ? images : undefined,
    placeSlug: typeof placeSlug === "string" && placeSlug.length > 0 ? placeSlug : undefined,
  });

  redirect("/admin");
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/new/actions.ts
git commit -m "Add server action for corpus ingestion capture form"
```

---

## Task 6: `app/admin/new/page.tsx` — capture form

**Files:**
- Create: `app/admin/new/page.tsx`

**Interfaces:**
- Consumes: `submitCapture` (Task 5), `getActivePlaces` (existing, `src/corpus/queries.ts`).
- Produces: the `/admin/new` route.

- [ ] **Step 1: Write `app/admin/new/page.tsx`**

```tsx
import { connection } from "next/server";
import { getActivePlaces } from "@/src/corpus/queries";
import { submitCapture } from "./actions";

export default async function AdminNewCapturePage() {
  await connection();

  const places = await getActivePlaces();

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl">Nouvelle capture</h1>
      <form action={submitCapture} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-encre/70">Texte (email, message, observation…)</span>
          <textarea
            name="text"
            rows={8}
            className="rounded-[10px] border border-sable/40 bg-calcaire-deep p-3"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-encre/70">Images (panneau, document, capture d'écran)</span>
          <input
            type="file"
            name="images"
            accept="image/*"
            multiple
            className="rounded-[10px] border border-sable/40 bg-calcaire-deep p-3"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-encre/70">Lieu concerné (si connu)</span>
          <select
            name="placeSlug"
            className="rounded-[10px] border border-sable/40 bg-calcaire-deep p-3"
          >
            <option value="">— Nouveau lieu ou non déterminé —</option>
            {places.map((place) => (
              <option key={place.id} value={place.slug}>
                {place.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-mediterranee px-5 py-3 text-white sm:w-auto"
        >
          Extraire
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify the full flow builds**

Run: `pnpm build`
Expected: build succeeds; `/admin/new` listed in the route output (protected by the existing `proxy.ts` matcher `/admin/:path*`, no additional auth wiring needed).

- [ ] **Step 4: Commit**

```bash
git add app/admin/new/page.tsx
git commit -m "Add /admin/new capture form"
```

---

## Task 7: End-to-end verification against real Gemini + Neon

**Files:**
- None — this task is verification only, requires a real `GEMINI_API_KEY` in `.env.local` (Task 2, Step 3).

**Interfaces:**
- None.

- [ ] **Step 1: Verify auth still protects the new route**

Run: `pnpm dev`, then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/new
```
Expected: `401` (no credentials — confirms `proxy.ts`'s existing `/admin/:path*` matcher covers the new route automatically, no new auth code needed).

- [ ] **Step 2: Submit a text-only capture and verify a real draft is written**

This step requires a real, working `GEMINI_API_KEY`. If one isn't available, mark this task `BLOCKED` and report back rather than proceeding with a fake/placeholder key — extraction cannot be meaningfully verified without it.

```bash
ADMIN_PW=$(grep ADMIN_PASSWORD .env.local | cut -d= -f2)
curl -s -u "admin:$ADMIN_PW" -X POST http://localhost:3000/admin/new \
  -F "text=Le parking de Port d'Alon est plein dès 9h30 le dimanche en juillet, d'après un habitué du coin."
```
Expected: a redirect response (302/303) to `/admin`.

- [ ] **Step 3: Confirm the draft landed in the dashboard**

```bash
curl -s -u "admin:$ADMIN_PW" http://localhost:3000/admin | grep -o "Port d.Alon\|parking"
```
Expected: some match found under the "À relire" (PENDING_REVIEW) section, OR under "Erreurs" if the model call failed for a real reason (e.g. invalid key, quota) — either way, confirms a row was written, not silently dropped. Report which outcome occurred.

- [ ] **Step 4: Test the weak-input under-extraction path**

```bash
curl -s -u "admin:$ADMIN_PW" -X POST http://localhost:3000/admin/new \
  -F "text=C'est joli par ici."
```
Expected: redirects successfully; the resulting draft should have `draftClaims: []` (zero claims) per rule 6 — this is a correct outcome, not a failure. You cannot verify the empty-claims content from the dashboard UI alone (it only shows a preview string, not full draft content) — if you want to confirm this precisely, note it as a known verification gap for the review-screen step (C), which will actually display `draftClaims`.

- [ ] **Step 5: Run the full test suite one more time**

Run: `pnpm exec vitest run`
Expected: all tests pass (should include the existing 18 plus this plan's new ones).

- [ ] **Step 6: No commit for this task** (verification only).

---

## Self-Review Notes

**Spec coverage check** (against `docs/superpowers/specs/2026-07-23-corpus-ingestion-capture-design.md`):
- `inputImages` migration to `Bytes[]` → Task 1. ✓
- `GEMINI_API_KEY`/`GEMINI_MODEL` env vars + `@google/genai` dependency → Task 2. ✓
- zod schema for extraction output, JSON Schema derivation → Task 3. ✓
- Image transcription (incl. blurry-image handling), structured extraction, validation, ERROR/PENDING_REVIEW write paths → Task 4. ✓
- Server action → Task 5. ✓
- Capture form (text, images, place selector) → Task 6. ✓
- End-to-end verification against real services → Task 7. ✓
- Out-of-scope items (review screen, real Place/Claim writes, sync-seed-files, retention cleanup) → correctly absent from all tasks. ✓

**Type consistency check:** `ExtractionResult`/`DraftPlace`/`DraftClaim` types (Task 3) are consumed unchanged by `ingestion.ts` (Task 4). `runIngestion`'s input shape (`{ text?, images?, placeSlug? }`) is defined once in Task 4 and consumed identically by Task 5's `actions.ts`. No cross-task signature drift.

**Known deviation from the design doc's suggested API, flagged and resolved during planning:** the design doc mentioned `z.fromJSONSchema()` as available for the JSON-Schema-to-Zod direction; this plan instead hand-writes the zod schema directly and derives the JSON Schema via `z.toJSONSchema()` (verified to exist in the installed zod version) — single source of truth, avoids depending on an experimental API (`fromJSONSchema` is explicitly documented as "semi-experimental" in zod's own source) for a data-integrity-relevant validation path. This is a refinement of the design, not a contradiction of it — the design doc flagged this exact API as "worth double-checking rather than assuming," and this plan's resolution is the outcome of that check.

**Known verification gap, disclosed:** Task 7's weak-input test (Step 4) can only confirm the request succeeds, not that `draftClaims` is actually empty — the dashboard UI doesn't expose full draft content yet (that's step C, the review screen). Noted rather than silently skipped.
