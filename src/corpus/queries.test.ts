import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  findManyPlaceMock,
  findFirstPlaceMock,
  findFirstStatusLogMock,
  findFirstClaimMock,
  findFirstZonePlaceMock,
  findManySignalZoneMock,
  cacheTagMock,
  cacheLifeMock,
} = vi.hoisted(() => ({
  findManyPlaceMock: vi.fn(),
  findFirstPlaceMock: vi.fn(),
  findFirstStatusLogMock: vi.fn(),
  findFirstClaimMock: vi.fn(),
  findFirstZonePlaceMock: vi.fn(),
  findManySignalZoneMock: vi.fn(),
  cacheTagMock: vi.fn(),
  cacheLifeMock: vi.fn(),
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
    signalZone: {
      findMany: findManySignalZoneMock,
    },
  },
}));

vi.mock("next/cache", () => ({ cacheTag: cacheTagMock, cacheLife: cacheLifeMock }));

import {
  getActivePlaces,
  getPlaceBySlug,
  resolvePlaceStatus,
  getPlaceFreshness,
  getAllPlaces,
  getSignalZones,
} from "./queries";
import { parisToday } from "./paris-date";

beforeEach(() => {
  findManyPlaceMock.mockReset();
  findFirstPlaceMock.mockReset();
  findFirstStatusLogMock.mockReset();
  findFirstClaimMock.mockReset();
  findFirstZonePlaceMock.mockReset();
  findManySignalZoneMock.mockReset();
  cacheTagMock.mockReset();
  cacheLifeMock.mockReset();
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

  it("is cached under the corpus tag", async () => {
    findManyPlaceMock.mockResolvedValue([]);

    await getActivePlaces();

    expect(cacheTagMock).toHaveBeenCalledWith("corpus");
    expect(cacheLifeMock).toHaveBeenCalledWith("corpus");
  });
});

describe("getPlaceBySlug", () => {
  it("queries an ACTIVE place by slug with only public+published claims", async () => {
    findFirstPlaceMock.mockResolvedValue({
      slug: "port-d-alon",
      claims: [{ claimText: "hook claim" }],
    });

    const result = await getPlaceBySlug("port-d-alon");

    const publicClaims = {
      where: { isPublic: true, status: "PUBLISHED" },
      include: {
        alternativePlace: { select: { slug: true, name: true } },
      },
    };
    expect(findFirstPlaceMock).toHaveBeenCalledWith({
      where: { slug: "port-d-alon", status: "ACTIVE" },
      include: {
        claims: publicClaims,
        parent: {
          select: { id: true, slug: true, name: true, status: true, claims: publicClaims },
        },
        children: {
          where: { status: "ACTIVE" },
          orderBy: { demandRank: "asc" },
        },
        images: { orderBy: { order: "asc" } },
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

  it("returns null when only a tomorrow-dated StatusLog row exists for a FIRE_ACCESS zone (does not surface tomorrow's forecast as today's status)", async () => {
    findFirstZonePlaceMock.mockResolvedValue({
      signalZone: { id: "zone-1", label: "SAINTE BAUME", signalSource: { provider: "Préfecture du Var" } },
    });

    const today = parisToday();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Only a "tomorrow" row exists (e.g. the admin's most recent save, whose
    // forDate is always write-day + 1 for FIRE_ACCESS); no row exists yet at
    // forDate = today. The resolver must query the exact "today" date and
    // must not fall forward onto the tomorrow row just because it's the
    // earliest row >= today.
    findFirstStatusLogMock.mockImplementation(async ({ where }) => {
      const queriedDate = new Date(where.forDate);
      if (queriedDate.getTime() === tomorrow.getTime()) {
        return {
          value: "rouge",
          detail: null,
          confirmedAt: new Date("2026-07-21T18:00:00Z"),
        };
      }
      return null;
    });

    const result = await resolvePlaceStatus("place-id-1");

    const callArgs = findFirstStatusLogMock.mock.calls[0][0];
    const queriedForDate = new Date(callArgs.where.forDate);
    expect(queriedForDate).toEqual(today);
    expect(result).toBeNull();
  });

  it("queries statusLog.findFirst with forDate as the Paris calendar day, not the server-TZ day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-21T22:30:00Z"));

    findFirstZonePlaceMock.mockResolvedValue({
      signalZone: { id: "zone-1", label: "SAINTE BAUME", signalSource: { provider: "Préfecture du Var" } },
    });
    findFirstStatusLogMock.mockResolvedValue(null);

    await resolvePlaceStatus("place-id-1");

    const callArgs = findFirstStatusLogMock.mock.calls[0][0];
    expect(callArgs.where.forDate).toEqual(new Date("2026-07-22T00:00:00.000Z"));

    vi.useRealTimers();
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

  it("inherits the parent's zone when a spot has no zone of its own", async () => {
    findFirstZonePlaceMock.mockImplementation(async ({ where }) =>
      where.placeId === "parent-id"
        ? { signalZone: { id: "zone-13", label: "CAP CANAILLE", signalSource: { provider: "Préfecture des Bouches-du-Rhône" } } }
        : null,
    );
    findFirstPlaceMock.mockImplementation(async ({ select }) =>
      select.parentId ? { parentId: "parent-id" } : { zapef: false },
    );
    findFirstStatusLogMock.mockResolvedValue({
      value: "vert",
      detail: null,
      confirmedAt: new Date("2026-07-21T18:00:00Z"),
    });

    const result = await resolvePlaceStatus("spot-id");

    expect(findFirstStatusLogMock.mock.calls[0][0].where.signalZoneId).toBe("zone-13");
    expect(result?.zoneLabel).toBe("CAP CANAILLE");
  });

  it("returns null when neither the spot nor its parent has a zone", async () => {
    findFirstZonePlaceMock.mockResolvedValue(null);
    findFirstPlaceMock.mockResolvedValue({ parentId: "parent-id" });

    const result = await resolvePlaceStatus("spot-id");

    expect(result).toBeNull();
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

describe("getAllPlaces", () => {
  it("queries all places regardless of status, ordered by demandRank", async () => {
    findManyPlaceMock.mockResolvedValue([{ slug: "port-d-alon" }]);
    const result = await getAllPlaces();
    expect(findManyPlaceMock).toHaveBeenCalledWith({
      orderBy: { demandRank: "asc" },
    });
    expect(result).toEqual([{ slug: "port-d-alon" }]);
  });
});

describe("getSignalZones", () => {
  it("queries active signal zones ordered by label", async () => {
    findManySignalZoneMock.mockResolvedValue([{ label: "SAINTE BAUME" }]);
    const result = await getSignalZones();
    expect(findManySignalZoneMock).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { label: "asc" },
    });
    expect(result).toEqual([{ label: "SAINTE BAUME" }]);
  });
});
