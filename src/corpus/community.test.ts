import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

const { communityLine, EARLY_DAYS_CONTRIBUTORS } = await import("./community");

describe("communityLine", () => {
  it("says the guide is only starting while there are few contributors", () => {
    expect(communityLine({ tipCount: 48, contributorCount: 1 })).toEqual({
      lead: "Ce n’est que le début :",
      counts: "48 conseils, 1 contributeur local",
    });
  });

  it("drops the lead once the community has grown", () => {
    expect(
      communityLine({ tipCount: 120, contributorCount: EARLY_DAYS_CONTRIBUTORS }),
    ).toEqual({ lead: null, counts: `120 conseils, ${EARLY_DAYS_CONTRIBUTORS} contributeurs locaux` });
  });

  it("shows nothing on an empty guide", () => {
    expect(communityLine({ tipCount: 0, contributorCount: 1 })).toBeNull();
  });
});
