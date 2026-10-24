import { describe, expect, it } from "vitest";
import { guessClaimKind, type ClaimKindInput } from "./claim-kind";

function claim(overrides: Partial<ClaimKindInput>): ClaimKindInput {
  return {
    claimType: "ACCESS",
    claimText: "Un texte neutre.",
    verification: "FIELD_VERIFIED",
    sourceType: "PERSONAL_VISIT",
    ...overrides,
  };
}

describe("guessClaimKind", () => {
  it("keeps crowding, avoid and tip themes as lived tips even from official sources", () => {
    for (const claimType of ["TIP", "CROWDING", "AVOID", "ALTERNATIVE"] as const) {
      expect(guessClaimKind(claim({ claimType, verification: "OFFICIAL" })).kind).toBe(
        "LOCAL_TIP",
      );
    }
  });

  it("treats official sources as practical info", () => {
    expect(guessClaimKind(claim({ sourceType: "OFFICIAL" })).kind).toBe("PRACTICAL_INFO");
    expect(guessClaimKind(claim({ verification: "OFFICIAL" })).kind).toBe("PRACTICAL_INFO");
  });

  it("treats opening hours and prices as practical info", () => {
    expect(
      guessClaimKind(
        claim({
          claimType: "SUITABILITY",
          claimText: "La traversée coûte 14 € par adulte, sans carte bancaire.",
        }),
      ).kind,
    ).toBe("PRACTICAL_INFO");
    expect(
      guessClaimKind(claim({ claimText: "Ouvert le samedi de 14h à 17h." })).kind,
    ).toBe("PRACTICAL_INFO");
  });

  it("treats first-person or advisory wording as a lived tip", () => {
    expect(
      guessClaimKind(claim({ claimText: "Arrivez avant 9h, après on ne trouve plus de place." }))
        .kind,
    ).toBe("LOCAL_TIP");
  });

  it("falls back on the source when the text is neutral", () => {
    expect(guessClaimKind(claim({ sourceType: "contribution" })).kind).toBe("LOCAL_TIP");
    expect(guessClaimKind(claim({ sourceType: null, verification: "HEURISTIC" })).kind).toBe(
      "PRACTICAL_INFO",
    );
  });
});
