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
