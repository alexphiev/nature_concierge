import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  findManyPlaceMock,
  findFirstPlaceMock,
  findFirstStatusLogMock,
  findFirstClaimMock,
  findFirstZonePlaceMock,
} = vi.hoisted(() => ({
  findManyPlaceMock: vi.fn(),
  findFirstPlaceMock: vi.fn(),
  findFirstStatusLogMock: vi.fn(),
  findFirstClaimMock: vi.fn(),
  findFirstZonePlaceMock: vi.fn(),
}));

vi.mock("./db", () => ({
  prisma: {
    place: {
      findMany: findManyPlaceMock,
      findFirst: findFirstPlaceMock,
    },
    statusLog: {
      findFirst: findFirstStatusLogMock,
    },
    claim: {
      findFirst: findFirstClaimMock,
    },
    zonePlace: {
      findFirst: findFirstZonePlaceMock,
    },
  },
}));

import {
  getActivePlaces,
  getPlaceBySlug,
  resolvePlaceStatus,
  getPlaceFreshness,
} from "./queries";

beforeEach(() => {
  findManyPlaceMock.mockReset();
  findFirstPlaceMock.mockReset();
  findFirstStatusLogMock.mockReset();
  findFirstClaimMock.mockReset();
  findFirstZonePlaceMock.mockReset();
});

describe("getActivePlaces", () => {
  it("queries ACTIVE places ordered by demandRank ascending", async () => {
    findManyPlaceMock.mockResolvedValue([{ slug: "port-d-alon" }]);

    const result = await getActivePlaces();

    expect(findManyPlaceMock).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
      orderBy: { demandRank: "asc" },
    });
    expect(result).toEqual([{ slug: "port-d-alon" }]);
  });
});

describe("getPlaceBySlug", () => {
  it("queries an ACTIVE place by slug with only public+published claims", async () => {
    findFirstPlaceMock.mockResolvedValue({
      slug: "port-d-alon",
      claims: [{ claimText: "hook claim" }],
    });

    const result = await getPlaceBySlug("port-d-alon");

    expect(findFirstPlaceMock).toHaveBeenCalledWith({
      where: { slug: "port-d-alon", status: "ACTIVE" },
      include: {
        claims: {
          where: { isPublic: true, status: "PUBLISHED" },
          include: {
            alternativePlace: { select: { slug: true, name: true } },
          },
        },
      },
    });
    expect(result).toEqual({
      slug: "port-d-alon",
      claims: [{ claimText: "hook claim" }],
    });
  });

  it("returns null when no matching place is found", async () => {
    findFirstPlaceMock.mockResolvedValue(null);

    const result = await getPlaceBySlug("does-not-exist");

    expect(result).toBeNull();
  });
});

describe("resolvePlaceStatus", () => {
  it("returns null when the place has no zone assignment", async () => {
    findFirstZonePlaceMock.mockResolvedValue(null);

    const result = await resolvePlaceStatus("place-id-1");

    expect(result).toBeNull();
  });

  it("returns null when the zone has no StatusLog row for today (non vérifié)", async () => {
    findFirstZonePlaceMock.mockResolvedValue({
      signalZone: { id: "zone-1", label: "SAINTE BAUME", signalSource: { provider: "Préfecture du Var" } },
    });
    findFirstStatusLogMock.mockResolvedValue(null);

    const result = await resolvePlaceStatus("place-id-1");

    expect(result).toBeNull();
  });

  it("resolves vert as open, not restricted", async () => {
    findFirstZonePlaceMock.mockResolvedValue({
      signalZone: { id: "zone-1", label: "SAINTE BAUME", signalSource: { provider: "Préfecture du Var" } },
    });
    findFirstStatusLogMock.mockResolvedValue({
      value: "vert",
      detail: null,
      confirmedAt: new Date("2026-07-21T18:00:00Z"),
    });
    findFirstPlaceMock.mockResolvedValue({ zapef: false });

    const result = await resolvePlaceStatus("place-id-1");

    expect(result).toEqual({
      zoneValue: "vert",
      displayValue: "vert",
      isOpen: true,
      restricted: false,
      detail: null,
      confirmedAt: new Date("2026-07-21T18:00:00Z"),
      zoneLabel: "SAINTE BAUME",
      provider: "Préfecture du Var",
    });
  });

  it("resolves rouge + zapef=true as open and restricted", async () => {
    findFirstZonePlaceMock.mockResolvedValue({
      signalZone: { id: "zone-1", label: "SAINTE BAUME", signalSource: { provider: "Préfecture du Var" } },
    });
    findFirstStatusLogMock.mockResolvedValue({
      value: "rouge",
      detail: "8h–17h, pinède + plage principale, parking réduit",
      confirmedAt: new Date("2026-07-21T18:00:00Z"),
    });
    findFirstPlaceMock.mockResolvedValue({ zapef: true });

    const result = await resolvePlaceStatus("place-id-1");

    expect(result?.isOpen).toBe(true);
    expect(result?.restricted).toBe(true);
    expect(result?.displayValue).toBe("rouge");
  });

  it("resolves rouge + zapef=false as closed", async () => {
    findFirstZonePlaceMock.mockResolvedValue({
      signalZone: { id: "zone-1", label: "SAINTE BAUME", signalSource: { provider: "Préfecture du Var" } },
    });
    findFirstStatusLogMock.mockResolvedValue({
      value: "rouge",
      detail: null,
      confirmedAt: new Date("2026-07-21T18:00:00Z"),
    });
    findFirstPlaceMock.mockResolvedValue({ zapef: false });

    const result = await resolvePlaceStatus("place-id-1");

    expect(result?.isOpen).toBe(false);
    expect(result?.restricted).toBe(false);
  });

  it("resolves extreme as closed regardless of zapef=true", async () => {
    findFirstZonePlaceMock.mockResolvedValue({
      signalZone: { id: "zone-1", label: "SAINTE BAUME", signalSource: { provider: "Préfecture du Var" } },
    });
    findFirstStatusLogMock.mockResolvedValue({
      value: "extreme",
      detail: null,
      confirmedAt: new Date("2026-07-21T18:00:00Z"),
    });
    findFirstPlaceMock.mockResolvedValue({ zapef: true });

    const result = await resolvePlaceStatus("place-id-1");

    expect(result?.isOpen).toBe(false);
    expect(result?.restricted).toBe(false);
    expect(result?.displayValue).toBe("extreme");
  });
});

describe("getPlaceFreshness", () => {
  it("returns the most recent of latest claim.updatedAt and latest StatusLog.confirmedAt", async () => {
    findFirstZonePlaceMock.mockResolvedValue({ signalZoneId: "zone-1" });
    findFirstClaimMock.mockResolvedValue({
      updatedAt: new Date("2026-07-20T10:00:00Z"),
    });
    findFirstStatusLogMock.mockResolvedValue({
      confirmedAt: new Date("2026-07-21T18:00:00Z"),
    });

    const result = await getPlaceFreshness("place-id-1");

    expect(findFirstClaimMock).toHaveBeenCalledWith({
      where: { placeId: "place-id-1", isPublic: true, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    expect(findFirstStatusLogMock).toHaveBeenCalledWith({
      where: { signalZoneId: "zone-1" },
      orderBy: { confirmedAt: "desc" },
      select: { confirmedAt: true },
    });
    expect(result).toEqual(new Date("2026-07-21T18:00:00Z"));
  });

  it("returns the claim date when it is more recent than the status log date", async () => {
    findFirstZonePlaceMock.mockResolvedValue({ signalZoneId: "zone-1" });
    findFirstClaimMock.mockResolvedValue({
      updatedAt: new Date("2026-07-21T10:00:00Z"),
    });
    findFirstStatusLogMock.mockResolvedValue({
      confirmedAt: new Date("2026-07-19T18:00:00Z"),
    });

    const result = await getPlaceFreshness("place-id-1");

    expect(result).toEqual(new Date("2026-07-21T10:00:00Z"));
  });

  it("skips the StatusLog lookup when the place has no zone assignment", async () => {
    findFirstZonePlaceMock.mockResolvedValue(null);
    findFirstClaimMock.mockResolvedValue({
      updatedAt: new Date("2026-07-20T10:00:00Z"),
    });

    const result = await getPlaceFreshness("place-id-1");

    expect(findFirstStatusLogMock).not.toHaveBeenCalled();
    expect(result).toEqual(new Date("2026-07-20T10:00:00Z"));
  });

  it("falls back to the place's own updatedAt when no claims or status logs exist", async () => {
    findFirstZonePlaceMock.mockResolvedValue(null);
    findFirstClaimMock.mockResolvedValue(null);
    findFirstStatusLogMock.mockResolvedValue(null);
    findFirstPlaceMock.mockResolvedValue({
      updatedAt: new Date("2026-07-01T00:00:00Z"),
    });

    const result = await getPlaceFreshness("place-id-1");

    expect(findFirstPlaceMock).toHaveBeenCalledWith({
      where: { id: "place-id-1" },
      select: { updatedAt: true },
    });
    expect(result).toEqual(new Date("2026-07-01T00:00:00Z"));
  });
});
