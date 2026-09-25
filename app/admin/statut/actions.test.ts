import { describe, it, expect, vi, beforeEach } from "vitest";

const { upsertStatusLogMock, revalidatePathMock } = vi.hoisted(() => ({
  upsertStatusLogMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/src/corpus/db", () => ({
  prisma: {
    statusLog: { upsert: upsertStatusLogMock },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { saveStatus } from "./actions";

beforeEach(() => {
  upsertStatusLogMock.mockReset();
  revalidatePathMock.mockReset();
});

describe("saveStatus", () => {
  it("writes one StatusLog per submitted zone with the correct forDate", async () => {
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

  it("only revalidates the admin statut page, since public status is rendered at request time", async () => {
    const formData = new FormData();
    formData.set("forDate", "2026-07-22");
    formData.set("zone-zone1-signalType", "FIRE_ACCESS");
    formData.set("zone-zone1-value", "vert");
    formData.set("zone-zone1-detail", "");

    await saveStatus(formData);

    expect(revalidatePathMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/statut", "page");
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
});
