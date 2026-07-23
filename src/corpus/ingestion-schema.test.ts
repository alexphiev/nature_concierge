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
