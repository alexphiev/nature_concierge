import { describe, expect, it } from "vitest";
import { placeNeeds, needsHelp, WELL_COVERED } from "./place-needs";
import type { ClaimKind, ClaimType } from "../../prisma/generated/client";

function claims(kind: ClaimKind, ...types: ClaimType[]) {
  return types.map((claimType) => ({ kind, claimType }));
}

describe("placeNeeds", () => {
  it("asks three questions on an empty place, starting with a lived tip", () => {
    const needs = placeNeeds({ claims: [], ownPhotoCount: 0 });
    expect(needs.questions).toHaveLength(3);
    expect(needs.questions[0].kind).toBe("LOCAL_TIP");
    expect(needs.questions[1].kind).toBe("PRACTICAL_INFO");
    expect(needs.wantsPhotos).toBe(true);
  });

  it("does not ask about a theme already covered for that kind", () => {
    const needs = placeNeeds({
      claims: claims("LOCAL_TIP", "TIP", "CROWDING"),
      ownPhotoCount: 2,
    });
    const themes = needs.questions.filter((q) => q.kind === "LOCAL_TIP").map((q) => q.theme);
    expect(themes).not.toContain("TIP");
    expect(themes).not.toContain("CROWDING");
    expect(needs.wantsPhotos).toBe(false);
  });

  it("stops asking once both kinds are well covered", () => {
    const needs = placeNeeds({
      claims: [
        ...claims("LOCAL_TIP", ...Array<ClaimType>(WELL_COVERED).fill("TIP")),
        ...claims("PRACTICAL_INFO", ...Array<ClaimType>(WELL_COVERED).fill("ACCESS")),
      ],
      ownPhotoCount: 3,
    });
    expect(needsHelp(needs)).toBe(false);
    expect(needs.tipCount).toBe(WELL_COVERED);
    expect(needs.practicalCount).toBe(WELL_COVERED);
  });

  it("keeps asking for lived tips when only practical info exists", () => {
    const needs = placeNeeds({
      claims: claims("PRACTICAL_INFO", "ACCESS", "PRACTICAL", "SUITABILITY", "ACCESS"),
      ownPhotoCount: 1,
    });
    expect(needs.questions.length).toBeGreaterThan(0);
    expect(needs.questions.every((q) => q.kind === "LOCAL_TIP")).toBe(true);
  });
});
