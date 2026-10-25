import { describe, expect, it, vi } from "vitest";

const systemOne = vi.fn();
vi.mock("@typesafe-ai/sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@typesafe-ai/sdk")>()),
  TypeSafeClient: vi.fn(function () {
    return { systemOne };
  }),
}));

const { classifyClaimKind } = await import("./claim-kind-ai");

describe("classifyClaimKind", () => {
  it("sends the place and the claim to Jev", async () => {
    systemOne.mockResolvedValueOnce({ answers: { practical: { noul: 0.9 } } });
    await classifyClaimKind("Île Verte", { claimText: "Navette 14 €.", claimType: "ACCESS" });
    expect(systemOne).toHaveBeenCalledWith(
      expect.objectContaining({
        state: { place: "Île Verte", claim: { text: "Navette 14 €.", theme: "ACCESS" } },
      }),
    );
  });

  it("maps a high score to practical info and a low one to a lived tip", async () => {
    systemOne.mockResolvedValueOnce({ answers: { practical: { noul: 0.9 } } });
    expect(await classifyClaimKind("X", { claimText: "a", claimType: "ACCESS" })).toEqual({
      kind: "PRACTICAL_INFO",
      confidence: expect.closeTo(0.8),
    });
    systemOne.mockResolvedValueOnce({ answers: { practical: { noul: 0.2 } } });
    expect(await classifyClaimKind("X", { claimText: "a", claimType: "TIP" })).toEqual({
      kind: "LOCAL_TIP",
      confidence: expect.closeTo(0.6),
    });
  });
});
