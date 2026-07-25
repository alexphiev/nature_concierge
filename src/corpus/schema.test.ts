import { describe, it, expect } from "vitest";
import { validatePlaceFile } from "./schema";
import type { PlaceFileInput } from "./schema";

function basePlace(overrides: Partial<PlaceFileInput> = {}): PlaceFileInput {
  return {
    slug: "test-place",
    name: "Test Place",
    commune: "Test Commune",
    departement: "83",
    lat: 43.0,
    lng: 5.6,
    type: "CALANQUE",
    demandRank: 1,
    zapef: false,
    sources: {
      src1: {
        type: "OT_CONVERSATION",
        dateCollected: "2026-07-18",
        reliability: 3,
      },
    },
    claims: [],
    ...overrides,
  };
}

describe("validatePlaceFile", () => {
  it("rejects a non-PERMANENT claim with empty conditions", () => {
    const place = basePlace({
      claims: [
        {
          claimText: "Test claim.",
          claimType: "TIP",
          conditions: [],
          audience: ["tous"],
          verdict: "GO",
          source: "src1",
          verification: "OFFICIAL",
          decayClass: "SEASONAL",
          verifiedOn: "2026-07-18",
          isPublic: true,
        },
      ],
    });

    const result = validatePlaceFile(place, new Set(["test-place"]));

    expect(result.errors).toContain(
      "test-place: claim \"Test claim.\" has empty conditions but decayClass is not PERMANENT",
    );
  });

  it("allows empty conditions when decayClass is PERMANENT", () => {
    const place = basePlace({
      claims: [
        {
          claimText: "Test claim.",
          claimType: "TIP",
          conditions: [],
          audience: ["tous"],
          verdict: "GO",
          source: "src1",
          verification: "OFFICIAL",
          decayClass: "PERMANENT",
          verifiedOn: "2026-07-18",
          isPublic: true,
        },
      ],
    });

    const result = validatePlaceFile(place, new Set(["test-place"]));

    expect(result.errors).toEqual([]);
  });
});

describe("validatePlaceFile — ALTERNATIVE verdict", () => {
  it("rejects verdict ALTERNATIVE with no alternativePlaceSlug", () => {
    const place = basePlace({
      claims: [
        {
          claimText: "Test claim.",
          claimType: "ALTERNATIVE",
          conditions: ["ete"],
          audience: ["tous"],
          verdict: "ALTERNATIVE",
          source: "src1",
          verification: "OFFICIAL",
          decayClass: "SEASONAL",
          verifiedOn: "2026-07-18",
          isPublic: true,
        },
      ],
    });

    const result = validatePlaceFile(place, new Set(["test-place"]));

    expect(result.errors).toContain(
      "test-place: claim \"Test claim.\" has verdict ALTERNATIVE but no alternativePlaceSlug",
    );
  });

  it("rejects verdict ALTERNATIVE with alternativePlaceSlug not in corpus", () => {
    const place = basePlace({
      claims: [
        {
          claimText: "Test claim.",
          claimType: "ALTERNATIVE",
          conditions: ["ete"],
          audience: ["tous"],
          verdict: "ALTERNATIVE",
          alternativePlaceSlug: "does-not-exist",
          source: "src1",
          verification: "OFFICIAL",
          decayClass: "SEASONAL",
          verifiedOn: "2026-07-18",
          isPublic: true,
        },
      ],
    });

    const result = validatePlaceFile(place, new Set(["test-place"]));

    expect(result.errors).toContain(
      "test-place: claim \"Test claim.\" references unknown alternativePlaceSlug \"does-not-exist\"",
    );
  });

  it("accepts verdict ALTERNATIVE with a resolvable alternativePlaceSlug", () => {
    const place = basePlace({
      claims: [
        {
          claimText: "Test claim.",
          claimType: "ALTERNATIVE",
          conditions: ["ete"],
          audience: ["tous"],
          verdict: "ALTERNATIVE",
          alternativePlaceSlug: "other-place",
          source: "src1",
          verification: "OFFICIAL",
          decayClass: "SEASONAL",
          verifiedOn: "2026-07-18",
          isPublic: true,
        },
      ],
    });

    const result = validatePlaceFile(
      place,
      new Set(["test-place", "other-place"]),
    );

    expect(result.errors).toEqual([]);
  });
});

describe("validatePlaceFile — source key resolution", () => {
  it("rejects a claim whose source key isn't in the file's sources map", () => {
    const place = basePlace({
      claims: [
        {
          claimText: "Test claim.",
          claimType: "TIP",
          conditions: ["ete"],
          audience: ["tous"],
          verdict: "GO",
          source: "does-not-exist",
          verification: "OFFICIAL",
          decayClass: "SEASONAL",
          verifiedOn: "2026-07-18",
          isPublic: true,
        },
      ],
    });

    const result = validatePlaceFile(place, new Set(["test-place"]));

    expect(result.errors).toContain(
      "test-place: claim \"Test claim.\" references unknown source key \"does-not-exist\"",
    );
  });
});

describe("validatePlaceFile — verifiedOn backlog", () => {
  it("warns when a SEASONAL claim's verifiedOn is older than 1 year", () => {
    const place = basePlace({
      claims: [
        {
          claimText: "Old claim.",
          claimType: "TIP",
          conditions: ["ete"],
          audience: ["tous"],
          verdict: "GO",
          source: "src1",
          verification: "OFFICIAL",
          decayClass: "SEASONAL",
          verifiedOn: "2020-01-01",
          isPublic: true,
        },
      ],
    });

    const result = validatePlaceFile(place, new Set(["test-place"]));

    expect(result.warnings).toContain(
      "test-place: claim \"Old claim.\" is SEASONAL and verifiedOn (2020-01-01) is older than 1 year — re-verification backlog",
    );
    expect(result.errors).toEqual([]);
  });

  it("rejects a claim with verifiedOn in the future", () => {
    const place = basePlace({
      claims: [
        {
          claimText: "Future claim.",
          claimType: "TIP",
          conditions: ["ete"],
          audience: ["tous"],
          verdict: "GO",
          source: "src1",
          verification: "OFFICIAL",
          decayClass: "SEASONAL",
          verifiedOn: "2099-01-01",
          isPublic: true,
        },
      ],
    });

    const result = validatePlaceFile(place, new Set(["test-place"]));

    expect(result.errors).toContain(
      "test-place: claim \"Future claim.\" has verifiedOn (2099-01-01) in the future",
    );
  });
});

describe("validatePlaceFile — claimText length", () => {
  it("warns when claimText exceeds ~220 chars", () => {
    const longText = "A".repeat(221) + ".";
    const place = basePlace({
      claims: [
        {
          claimText: longText,
          claimType: "TIP",
          conditions: ["ete"],
          audience: ["tous"],
          verdict: "GO",
          source: "src1",
          verification: "OFFICIAL",
          decayClass: "SEASONAL",
          verifiedOn: "2026-07-18",
          isPublic: true,
        },
      ],
    });

    const result = validatePlaceFile(place, new Set(["test-place"]));

    expect(result.warnings.some((w) => w.includes("exceeds 220 characters"))).toBe(
      true,
    );
  });
});

describe("validatePlaceFile — departement enum", () => {
  it("rejects a departement outside {13, 83}", () => {
    const place = basePlace({ departement: "75" as never });

    const result = validatePlaceFile(place, new Set(["test-place"]));

    expect(result.errors.some((e) => e.includes("departement"))).toBe(true);
  });
});
