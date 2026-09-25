import { describe, it, expect, vi, beforeEach } from "vitest";

const { upsertStatusLogMock, findManyZonePlaceMock, revalidatePathMock } = vi.hoisted(() => ({
  upsertStatusLogMock: vi.fn(),
  findManyZonePlaceMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/src/corpus/db", () => ({
  prisma: {
    statusLog: { upsert: upsertStatusLogMock },
    zonePlace: { findMany: findManyZonePlaceMock },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { saveStatus } from "./actions";

beforeEach(() => {
  upsertStatusLogMock.mockReset();
  findManyZonePlaceMock.mockReset();
  revalidatePathMock.mockReset();
});

describe("saveStatus", () => {
  it("writes one StatusLog per submitted zone with the correct forDate", async () => {
    findManyZonePlaceMock.mockResolvedValue([{ place: { slug: "port-d-alon", parent: null, children: [] } }]);

    const formData = new FormData();
    formData.set("forDate", "2026-07-22");
    formData.set("zone-zone1-signalType", "FIRE_ACCESS");
    formData.set("zone-zone1-value", "rouge");
    formData.set("zone-zone1-detail", "8h-17h");

    await saveStatus(formData);

    expect(upsertStatusLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { signalZoneId_forDate: expect.objectContaining({ signalZoneId: "zone1" }) },
        create: expect.objectContaining({ signalZoneId: "zone1", value: "rouge", detail: "8h-17h" }),
      }),
    );
  });

  it("revalidates every place under a changed zone", async () => {
    findManyZonePlaceMock.mockResolvedValue([
      { place: { slug: "port-d-alon", parent: null, children: [] } },
      { place: { slug: "other-place", parent: null, children: [] } },
    ]);

    const formData = new FormData();
    formData.set("forDate", "2026-07-22");
    formData.set("zone-zone1-signalType", "FIRE_ACCESS");
    formData.set("zone-zone1-value", "vert");
    formData.set("zone-zone1-detail", "");

    await saveStatus(formData);

    expect(revalidatePathMock).toHaveBeenCalledWith("/places/port-d-alon", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/places/other-place", "page");
  });

  it("skips zones with no submitted value (not touched today)", async () => {
    const formData = new FormData();
    formData.set("forDate", "2026-07-22");
    // no zone-* fields set at all

    await saveStatus(formData);

    expect(upsertStatusLogMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/statut", "page");
  });

  it("revalidates the spots and the parent of a place under a changed zone", async () => {
    findManyZonePlaceMock.mockResolvedValue([
      {
        place: {
          slug: "calanque-mugel",
          parent: null,
          children: [{ slug: "anse-du-sec" }, { slug: "petit-mugel" }],
        },
      },
      { place: { slug: "grand-mugel", parent: { slug: "calanque-mugel" }, children: [] } },
    ]);

    const formData = new FormData();
    formData.set("forDate", "2026-07-22");
    formData.set("zone-zone1-value", "rouge");

    await saveStatus(formData);

    for (const slug of ["calanque-mugel", "anse-du-sec", "petit-mugel", "grand-mugel"]) {
      expect(revalidatePathMock).toHaveBeenCalledWith(`/places/${slug}`, "page");
    }
  });
});
