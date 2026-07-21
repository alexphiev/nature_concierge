import { z } from "zod";
import { ConditionSchema, AudienceSchema } from "./taxonomy";

export const PlaceTypeSchema = z.enum([
  "CALANQUE",
  "PLAGE",
  "MASSIF",
  "SENTIER",
  "SOMMET",
  "SITE",
]);

export const ClaimTypeSchema = z.enum([
  "ACCESS",
  "CROWDING",
  "SUITABILITY",
  "TIP",
  "AVOID",
  "ALTERNATIVE",
  "DECODING",
]);

export const VerdictSchema = z.enum(["GO", "GO_IF", "AVOID", "ALTERNATIVE"]);

export const VerificationSchema = z.enum([
  "FIELD_VERIFIED",
  "OFFICIAL",
  "LOCAL_TESTIMONY",
  "HEURISTIC",
]);

export const DecayClassSchema = z.enum(["PERMANENT", "SEASONAL", "ANNUAL_CHECK"]);

export const SourceTypeSchema = z.enum([
  "OFFICIAL",
  "PERSONAL_VISIT",
  "LOCAL_PERSON",
  "OT_CONVERSATION",
  "REDDIT_LEAD",
  "INSTAGRAM_LEAD",
  "FACEBOOK_LEAD",
  "PRESS_LEAD",
]);

export const SourceInputSchema = z.object({
  type: SourceTypeSchema,
  urlOrRef: z.string().optional(),
  dateCollected: z.string(),
  reliability: z.number().int().min(1).max(3).default(2),
  notes: z.string().optional(),
});

export const ClaimInputSchema = z.object({
  claimText: z.string(),
  claimType: ClaimTypeSchema,
  conditions: z.array(ConditionSchema),
  audience: z.array(AudienceSchema),
  verdict: VerdictSchema,
  alternativePlaceSlug: z.string().optional(),
  source: z.string(),
  verification: VerificationSchema,
  decayClass: DecayClassSchema,
  verifiedOn: z.string(),
  isPublic: z.boolean().default(false),
});

export const PlaceFileSchema = z.object({
  slug: z.string(),
  name: z.string(),
  commune: z.string(),
  departement: z.enum(["13", "83"]),
  lat: z.number(),
  lng: z.number(),
  type: PlaceTypeSchema,
  governingAuthority: z.string().optional(),
  officialInfoUrl: z.string().optional(),
  description: z.string().optional(),
  demandRank: z.number().int(),
  sources: z.record(z.string(), SourceInputSchema),
  claims: z.array(ClaimInputSchema),
});

export type SourceInput = z.infer<typeof SourceInputSchema>;
export type ClaimInput = z.infer<typeof ClaimInputSchema>;
export type PlaceFileInput = z.infer<typeof PlaceFileSchema>;

export function definePlace(input: PlaceFileInput): PlaceFileInput {
  return input;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export function validatePlaceFile(
  file: PlaceFileInput,
  allSlugs: Set<string>,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const parsed = PlaceFileSchema.safeParse(file);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${file.slug}: ${issue.path.join(".")}: ${issue.message}`);
    }
    return { errors, warnings };
  }

  const now = new Date();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;

  for (const claim of file.claims) {
    if (claim.conditions.length === 0 && claim.decayClass !== "PERMANENT") {
      errors.push(
        `${file.slug}: claim "${claim.claimText}" has empty conditions but decayClass is not PERMANENT`,
      );
    }

    if (claim.verdict === "ALTERNATIVE") {
      if (!claim.alternativePlaceSlug) {
        errors.push(
          `${file.slug}: claim "${claim.claimText}" has verdict ALTERNATIVE but no alternativePlaceSlug`,
        );
      } else if (!allSlugs.has(claim.alternativePlaceSlug)) {
        errors.push(
          `${file.slug}: claim "${claim.claimText}" references unknown alternativePlaceSlug "${claim.alternativePlaceSlug}"`,
        );
      }
    }

    if (!(claim.source in file.sources)) {
      errors.push(
        `${file.slug}: claim "${claim.claimText}" references unknown source key "${claim.source}"`,
      );
    }

    const verifiedOn = new Date(claim.verifiedOn);
    if (verifiedOn.getTime() > now.getTime()) {
      errors.push(
        `${file.slug}: claim "${claim.claimText}" has verifiedOn (${claim.verifiedOn}) in the future`,
      );
    } else if (
      claim.decayClass === "SEASONAL" &&
      now.getTime() - verifiedOn.getTime() > oneYearMs
    ) {
      warnings.push(
        `${file.slug}: claim "${claim.claimText}" is SEASONAL and verifiedOn (${claim.verifiedOn}) is older than 1 year — re-verification backlog`,
      );
    }

    if (claim.claimText.length > 220) {
      warnings.push(
        `${file.slug}: claim "${claim.claimText.slice(0, 40)}…" claimText exceeds 220 characters`,
      );
    }
  }

  return { errors, warnings };
}
