import { describe, it, expect, vi, beforeEach } from "vitest";

const { createPlaceMock, updatePlaceMock, createManyZonePlaceMock, deleteManyZonePlaceMock, redirectMock } =
  vi.hoisted(() => ({
    createPlaceMock: vi.fn(),
    updatePlaceMock: vi.fn(),
    createManyZonePlaceMock: vi.fn(),
    deleteManyZonePlaceMock: vi.fn(),
    redirectMock: vi.fn(),
  }));

vi.mock("@/src/corpus/db", () => ({
  prisma: {
    place: {
      create: createPlaceMock,
      update: updatePlaceMock,
    },
    zonePlace: {
      createMany: createManyZonePlaceMock,
      deleteMany: deleteManyZonePlaceMock,
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import { createPlace, updatePlace } from "./actions";

function baseFormData(): FormData {
  const formData = new FormData();
  formData.set("name", "Port d'Alon");
  formData.set("slug", "port-d-alon");
  formData.set("commune", "Saint-Cyr-sur-Mer");
  formData.set("departement", "83");
  formData.set("lat", "43.18");
  formData.set("lng", "5.71");
  formData.set("type", "CALANQUE");
  formData.set("demandRank", "1");
  formData.set("status", "ACTIVE");
  return formData;
}

beforeEach(() => {
  createPlaceMock.mockReset();
  updatePlaceMock.mockReset();
  createManyZonePlaceMock.mockReset();
  deleteManyZonePlaceMock.mockReset();
  redirectMock.mockReset();
});

describe("createPlace", () => {
  it("creates a Place then ZonePlace rows for each selected zone", async () => {
    createPlaceMock.mockResolvedValue({ id: "place-1" });
    const formData = baseFormData();
    formData.append("zoneIds", "zone-1");
    formData.append("zoneIds", "zone-2");

    await createPlace(formData);

    expect(createPlaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Port d'Alon",
          slug: "port-d-alon",
          commune: "Saint-Cyr-sur-Mer",
          departement: "83",
          lat: 43.18,
          lng: 5.71,
          type: "CALANQUE",
          demandRank: 1,
          status: "ACTIVE",
        }),
      }),
    );
    expect(createManyZonePlaceMock).toHaveBeenCalledWith({
      data: [
        { signalZoneId: "zone-1", placeId: "place-1" },
        { signalZoneId: "zone-2", placeId: "place-1" },
      ],
    });
    expect(redirectMock).toHaveBeenCalledWith("/admin/places");
  });

  it("skips zonePlace.createMany when no zones are selected", async () => {
    createPlaceMock.mockResolvedValue({ id: "place-1" });
    const formData = baseFormData();

    await createPlace(formData);

    expect(createManyZonePlaceMock).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/admin/places");
  });
});

describe("updatePlace", () => {
  it("replaces zone assignments by deleting then recreating, not merging", async () => {
    const formData = baseFormData();
    formData.append("zoneIds", "zone-3");

    await updatePlace("place-1", formData);

    expect(updatePlaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "place-1" },
        data: expect.objectContaining({ name: "Port d'Alon" }),
      }),
    );
    expect(deleteManyZonePlaceMock).toHaveBeenCalledWith({ where: { placeId: "place-1" } });
    expect(createManyZonePlaceMock).toHaveBeenCalledWith({
      data: [{ signalZoneId: "zone-3", placeId: "place-1" }],
    });

    const deleteOrder = deleteManyZonePlaceMock.mock.invocationCallOrder[0];
    const createOrder = createManyZonePlaceMock.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(createOrder);
    expect(redirectMock).toHaveBeenCalledWith("/admin/places");
  });

  it("skips zonePlace.createMany when no zones are selected, but still deletes existing assignments", async () => {
    const formData = baseFormData();

    await updatePlace("place-1", formData);

    expect(deleteManyZonePlaceMock).toHaveBeenCalledWith({ where: { placeId: "place-1" } });
    expect(createManyZonePlaceMock).not.toHaveBeenCalled();
  });
});
