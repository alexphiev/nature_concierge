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
