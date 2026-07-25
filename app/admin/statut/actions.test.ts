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
    findManyZonePlaceMock.mockResolvedValue([{ place: { slug: "port-d-alon" } }]);

    const formData = new FormData();
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
      { place: { slug: "port-d-alon" } },
      { place: { slug: "other-place" } },
    ]);

    const formData = new FormData();
    formData.set("zone-zone1-signalType", "FIRE_ACCESS");
    formData.set("zone-zone1-value", "vert");
    formData.set("zone-zone1-detail", "");

    await saveStatus(formData);

    expect(revalidatePathMock).toHaveBeenCalledWith("/places/port-d-alon", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/places/other-place", "page");
  });

  it("skips zones with no submitted value (not touched today)", async () => {
    const formData = new FormData();
    // no zone-* fields set at all

    await saveStatus(formData);

    expect(upsertStatusLogMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
