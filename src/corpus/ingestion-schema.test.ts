import { describe, it, expect } from "vitest";
import { DraftSourceSchema, DraftClaimSchema, BlockExtractionResultSchema } from "./ingestion-schema";

describe("DraftSourceSchema", () => {
  it("requires type to be a valid SourceType enum value", () => {
    const validSource = DraftSourceSchema.safeParse({
      type: "OFFICIAL",
      urlOrRef: "https://example.com",
      dateCollected: "2024-01-15",
      reliability: 2,
      notes: "Test source",
    });
    expect(validSource.success).toBe(true);

    const invalidSource = DraftSourceSchema.safeParse({
      type: "INVALID_TYPE",
      urlOrRef: "https://example.com",
      dateCollected: "2024-01-15",
      reliability: 2,
      notes: "Test source",
    });
    expect(invalidSource.success).toBe(false);
  });
});

describe("DraftClaimSchema", () => {
  it("rejects a claim with empty conditions when decayClass is not PERMANENT", () => {
    const result = DraftClaimSchema.safeParse({
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
      placeMismatch: false,
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty conditions when decayClass is PERMANENT", () => {
    const result = DraftClaimSchema.safeParse({
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
      placeMismatch: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("BlockExtractionResultSchema", () => {
  it("accepts source: null (no source identifiable)", () => {
    const result = BlockExtractionResultSchema.safeParse({
      source: null,
      claims: [
        {
          claimText: "Test claim",
          claimType: "TIP",
          conditions: ["ete"],
          audience: ["tous"],
          verdict: "GO_IF",
          verification: "LOCAL_TESTIMONY",
          decayClass: "SEASONAL",
          sourceSnippet: "test",
          reasoning: null,
          needsReview: false,
          placeMismatch: false,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a claims array with placeMismatch: true", () => {
    const result = BlockExtractionResultSchema.safeParse({
      source: {
        type: "OFFICIAL",
        urlOrRef: null,
        dateCollected: "2024-01-15",
        reliability: 2,
        notes: null,
      },
      claims: [
        {
          claimText: "This claim doesn't match the place",
          claimType: "ACCESS",
          conditions: ["ete", "dimanche"],
          audience: ["tous"],
          verdict: "GO",
          verification: "OFFICIAL",
          decayClass: "PERMANENT",
          sourceSnippet: "mismatched content",
          reasoning: "Was extracted for wrong place",
          needsReview: true,
          placeMismatch: true,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
