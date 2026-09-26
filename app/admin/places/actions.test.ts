import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  createPlaceMock,
  updatePlaceMock,
  findUniqueOrThrowPlaceMock,
  countPlaceMock,
  createManyZonePlaceMock,
  deleteManyZonePlaceMock,
  createManyPlaceImageMock,
  deleteManyPlaceImageMock,
  findManyPlacePhotoMock,
  findFirstPlacePhotoMock,
  createPlacePhotoMock,
  updatePlacePhotoMock,
  deleteManyPlacePhotoMock,
  putPlacePhotoMock,
  deletePlacePhotosMock,
  updateTagMock,
} = vi.hoisted(() => ({
  createPlaceMock: vi.fn(),
  updatePlaceMock: vi.fn(),
  findUniqueOrThrowPlaceMock: vi.fn(),
  countPlaceMock: vi.fn(),
  createManyZonePlaceMock: vi.fn(),
  deleteManyZonePlaceMock: vi.fn(),
  createManyPlaceImageMock: vi.fn(),
  deleteManyPlaceImageMock: vi.fn(),
  findManyPlacePhotoMock: vi.fn(),
  findFirstPlacePhotoMock: vi.fn(),
  createPlacePhotoMock: vi.fn(),
  updatePlacePhotoMock: vi.fn(),
  deleteManyPlacePhotoMock: vi.fn(),
  putPlacePhotoMock: vi.fn(),
  deletePlacePhotosMock: vi.fn(),
  updateTagMock: vi.fn(),
}));

vi.mock("@/src/corpus/db", () => ({
  prisma: {
    place: {
      create: createPlaceMock,
      update: updatePlaceMock,
      findUniqueOrThrow: findUniqueOrThrowPlaceMock,
      count: countPlaceMock,
    },
    zonePlace: {
      createMany: createManyZonePlaceMock,
      deleteMany: deleteManyZonePlaceMock,
    },
    placeImage: {
      createMany: createManyPlaceImageMock,
      deleteMany: deleteManyPlaceImageMock,
    },
    placePhoto: {
      findMany: findManyPlacePhotoMock,
      findFirst: findFirstPlacePhotoMock,
      create: createPlacePhotoMock,
      update: updatePlacePhotoMock,
      deleteMany: deleteManyPlacePhotoMock,
    },
  },
}));

vi.mock("next/cache", () => ({
  updateTag: updateTagMock,
}));

vi.mock("@/src/storage/place-photos", () => ({
  placePhotoKey: (placeId: string) => `places/${placeId}/uuid.jpg`,
  placePhotoUrl: (key: string) => `https://storage.test/place-photos/${key}`,
  putPlacePhoto: putPlacePhotoMock,
  deletePlacePhotos: deletePlacePhotosMock,
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
  findUniqueOrThrowPlaceMock.mockReset();
  countPlaceMock.mockReset();
  createManyZonePlaceMock.mockReset();
  deleteManyZonePlaceMock.mockReset();
  createManyPlaceImageMock.mockReset();
  deleteManyPlaceImageMock.mockReset();
  findManyPlacePhotoMock.mockReset();
  findFirstPlacePhotoMock.mockReset();
  createPlacePhotoMock.mockReset();
  updatePlacePhotoMock.mockReset();
  deleteManyPlacePhotoMock.mockReset();
  putPlacePhotoMock.mockReset();
  deletePlacePhotosMock.mockReset();
  updateTagMock.mockReset();
  findManyPlacePhotoMock.mockResolvedValue([]);
});

describe("createPlace", () => {
  it("creates a Place then ZonePlace rows for each selected zone", async () => {
    createPlaceMock.mockResolvedValue({ id: "place-1" });
    const formData = baseFormData();
    formData.append("zoneIds", "zone-1");
    formData.append("zoneIds", "zone-2");

    const result = await createPlace(formData);

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
    expect(updateTagMock).toHaveBeenCalledWith("corpus");
    expect(result).toEqual({ id: "place-1" });
  });

  it("skips zonePlace.createMany when no zones are selected", async () => {
    createPlaceMock.mockResolvedValue({ id: "place-1" });
    const formData = baseFormData();

    const result = await createPlace(formData);

    expect(createManyZonePlaceMock).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "place-1" });
  });

  it("persists googlePlaceId when provided", async () => {
    createPlaceMock.mockResolvedValue({ id: "place-1" });
    const formData = baseFormData();
    formData.set("googlePlaceId", "ChIJexample123");

    await createPlace(formData);

    expect(createPlaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ googlePlaceId: "ChIJexample123" }),
      }),
    );
  });

  it("stores null googlePlaceId when left blank", async () => {
    createPlaceMock.mockResolvedValue({ id: "place-1" });
    const formData = baseFormData();

    await createPlace(formData);

    expect(createPlaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ googlePlaceId: null }),
      }),
    );
  });
});

describe("updatePlace", () => {
  it("replaces zone assignments by deleting then recreating, not merging", async () => {
    const formData = baseFormData();
    formData.append("zoneIds", "zone-3");

    const result = await updatePlace("place-1", formData);

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
    expect(updateTagMock).toHaveBeenCalledWith("corpus");
    expect(result).toEqual({ id: "place-1" });
  });

  it("skips zonePlace.createMany when no zones are selected, but still deletes existing assignments", async () => {
    const formData = baseFormData();

    await updatePlace("place-1", formData);

    expect(deleteManyZonePlaceMock).toHaveBeenCalledWith({ where: { placeId: "place-1" } });
    expect(createManyZonePlaceMock).not.toHaveBeenCalled();
  });
});

describe("parent place (two levels max)", () => {
  it("stores parentId when the parent is a top-level place", async () => {
    createPlaceMock.mockResolvedValue({ id: "spot-1" });
    findUniqueOrThrowPlaceMock.mockResolvedValue({ parentId: null });
    const formData = baseFormData();
    formData.set("parentId", "mugel");

    await createPlace(formData);

    expect(createPlaceMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ parentId: "mugel" }) }),
    );
  });

  it("stores null parentId when left blank", async () => {
    createPlaceMock.mockResolvedValue({ id: "place-1" });

    await createPlace(baseFormData());

    expect(findUniqueOrThrowPlaceMock).not.toHaveBeenCalled();
    expect(createPlaceMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ parentId: null }) }),
    );
  });

  it("rejects a parent that is itself a spot", async () => {
    findUniqueOrThrowPlaceMock.mockResolvedValue({ parentId: "mugel" });
    const formData = baseFormData();
    formData.set("parentId", "anse-du-sec");

    const result = await createPlace(formData);

    expect(result).toEqual({ error: expect.stringContaining("2 niveaux maximum") });
    expect(createPlaceMock).not.toHaveBeenCalled();
  });

  it("rejects a place as its own parent", async () => {
    const formData = baseFormData();
    formData.set("parentId", "place-1");

    const result = await updatePlace("place-1", formData);

    expect(result).toEqual({ error: expect.stringContaining("son propre parent") });
    expect(updatePlaceMock).not.toHaveBeenCalled();
  });

  it("rejects giving a parent to a place that already has spots", async () => {
    findUniqueOrThrowPlaceMock.mockResolvedValue({ parentId: null });
    countPlaceMock.mockResolvedValue(2);
    const formData = baseFormData();
    formData.set("parentId", "other-place");

    const result = await updatePlace("place-1", formData);

    expect(result).toEqual({ error: expect.stringContaining("déjà des spots") });
    expect(updatePlaceMock).not.toHaveBeenCalled();
  });
});

describe("place images", () => {
  it("creates PlaceImage rows in order for each submitted URL on createPlace", async () => {
    createPlaceMock.mockResolvedValue({ id: "place-1" });
    const formData = baseFormData();
    formData.append("imageUrls", "https://example.com/a.jpg");
    formData.append("imageUrls", "https://other.fr/b.jpg");

    await createPlace(formData);

    expect(createManyPlaceImageMock).toHaveBeenCalledWith({
      data: [
        { url: "https://example.com/a.jpg", order: 0, placeId: "place-1" },
        { url: "https://other.fr/b.jpg", order: 1, placeId: "place-1" },
      ],
    });
  });

  it("skips blank URLs and skips placeImage.createMany when none remain", async () => {
    createPlaceMock.mockResolvedValue({ id: "place-1" });
    const formData = baseFormData();
    formData.append("imageUrls", "   ");

    await createPlace(formData);

    expect(createManyPlaceImageMock).not.toHaveBeenCalled();
  });

  it("replaces images by deleting then recreating on updatePlace", async () => {
    const formData = baseFormData();
    formData.append("imageUrls", "https://example.com/new.jpg");

    await updatePlace("place-1", formData);

    expect(deleteManyPlaceImageMock).toHaveBeenCalledWith({ where: { placeId: "place-1" } });
    expect(createManyPlaceImageMock).toHaveBeenCalledWith({
      data: [{ url: "https://example.com/new.jpg", order: 0, placeId: "place-1" }],
    });

    const deleteOrder = deleteManyPlaceImageMock.mock.invocationCallOrder[0];
    const createOrder = createManyPlaceImageMock.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(createOrder);
  });

  it("still deletes existing images on updatePlace when no URLs are submitted", async () => {
    const formData = baseFormData();

    await updatePlace("place-1", formData);

    expect(deleteManyPlaceImageMock).toHaveBeenCalledWith({ where: { placeId: "place-1" } });
    expect(createManyPlaceImageMock).not.toHaveBeenCalled();
  });
});
