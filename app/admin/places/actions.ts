"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/src/corpus/db";
import { Prisma } from "../../../prisma/generated/client";
import {
  deletePlacePhotos,
  placePhotoKey,
  placePhotoUrl,
  putPlacePhoto,
} from "@/src/storage/place-photos";
import { MAX_PHOTO_BYTES, isPlacePhotoType } from "@/src/storage/photo-types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function readImageUrls(formData: FormData): string[] {
  return formData
    .getAll("imageUrls")
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function readPhotoEdits(formData: FormData): { id: string; order: number; credit: string | null }[] {
  const credits = formData.getAll("photoCredits").map((v) => String(v).trim());
  return formData
    .getAll("photoIds")
    .map((id, order) => ({ id: String(id), order, credit: credits[order] || null }));
}

async function savePhotoEdits(placeId: string, formData: FormData): Promise<void> {
  const photos = readPhotoEdits(formData);

  const removed = await prisma.placePhoto.findMany({
    where: { placeId, id: { notIn: photos.map((p) => p.id) } },
    select: { id: true, key: true },
  });
  if (removed.length > 0) {
    await prisma.placePhoto.deleteMany({ where: { id: { in: removed.map((p) => p.id) } } });
  }

  await Promise.all(
    photos.map((photo) =>
      prisma.placePhoto.update({
        where: { id: photo.id, placeId },
        data: { order: photo.order, credit: photo.credit },
      }),
    ),
  );

  if (removed.length > 0) {
    try {
      await deletePlacePhotos(removed.map((p) => p.key));
    } catch (e) {
      console.error("Failed to delete place photo objects", e);
    }
  }
}

function readPlaceFields(formData: FormData) {
  const zoneIds = formData.getAll("zoneIds").filter((v): v is string => typeof v === "string");
  return {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? "") || slugify(String(formData.get("name") ?? "")),
    commune: String(formData.get("commune") ?? ""),
    departement: String(formData.get("departement") ?? ""),
    lat: Number(formData.get("lat")),
    lng: Number(formData.get("lng")),
    type: String(formData.get("type") ?? ""),
    governingAuthority: String(formData.get("governingAuthority") ?? "") || null,
    officialInfoUrl: String(formData.get("officialInfoUrl") ?? "") || null,
    googlePlaceId: String(formData.get("googlePlaceId") ?? "") || null,
    description: String(formData.get("description") ?? "") || null,
    demandRank: Number(formData.get("demandRank") ?? 999),
    zapef: formData.get("zapef") === "on",
    status: String(formData.get("status") ?? "DRAFT"),
    parentId: String(formData.get("parentId") ?? "") || null,
    zoneIds,
  };
}

async function assertValidParent(parentId: string | null, placeId?: string): Promise<string | null> {
  if (!parentId) return null;
  if (parentId === placeId) return "Un lieu ne peut pas être son propre parent";

  const parent = await prisma.place.findUniqueOrThrow({
    where: { id: parentId },
    select: { parentId: true },
  });
  if (parent.parentId) return "Le parent choisi est déjà un spot (2 niveaux maximum)";

  if (placeId) {
    const childCount = await prisma.place.count({ where: { parentId: placeId } });
    if (childCount > 0) return "Ce lieu a déjà des spots : il ne peut pas avoir de parent";
  }

  return null;
}

function slugConflictError(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Ce slug est déjà utilisé";
  }
  return null;
}

export async function createPlace(
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const fields = readPlaceFields(formData);
  const parentError = await assertValidParent(fields.parentId);
  if (parentError) return { error: parentError };

  let place: { id: string };
  try {
    place = await prisma.place.create({
      data: {
        name: fields.name,
        slug: fields.slug,
        commune: fields.commune,
        departement: fields.departement,
        lat: fields.lat,
        lng: fields.lng,
        type: fields.type as never,
        governingAuthority: fields.governingAuthority,
        officialInfoUrl: fields.officialInfoUrl,
        googlePlaceId: fields.googlePlaceId,
        description: fields.description,
        demandRank: fields.demandRank,
        zapef: fields.zapef,
        status: fields.status as never,
        parentId: fields.parentId,
      },
    });
  } catch (e) {
    const slugError = slugConflictError(e);
    if (slugError) return { error: slugError };
    throw e;
  }

  if (fields.zoneIds.length > 0) {
    await prisma.zonePlace.createMany({
      data: fields.zoneIds.map((signalZoneId) => ({ signalZoneId, placeId: place.id })),
    });
  }

  const imageUrls = readImageUrls(formData);
  if (imageUrls.length > 0) {
    await prisma.placeImage.createMany({
      data: imageUrls.map((url, order) => ({ url, order, placeId: place.id })),
    });
  }

  updateTag("corpus");
  return { id: place.id };
}

export async function updatePlace(
  placeId: string,
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const fields = readPlaceFields(formData);
  const parentError = await assertValidParent(fields.parentId, placeId);
  if (parentError) return { error: parentError };

  try {
    await prisma.place.update({
      where: { id: placeId },
      data: {
        name: fields.name,
        slug: fields.slug,
        commune: fields.commune,
        departement: fields.departement,
        lat: fields.lat,
        lng: fields.lng,
        type: fields.type as never,
        governingAuthority: fields.governingAuthority,
        officialInfoUrl: fields.officialInfoUrl,
        googlePlaceId: fields.googlePlaceId,
        description: fields.description,
        demandRank: fields.demandRank,
        zapef: fields.zapef,
        status: fields.status as never,
        parentId: fields.parentId,
      },
    });
  } catch (e) {
    const slugError = slugConflictError(e);
    if (slugError) return { error: slugError };
    throw e;
  }

  await prisma.zonePlace.deleteMany({ where: { placeId } });
  if (fields.zoneIds.length > 0) {
    await prisma.zonePlace.createMany({
      data: fields.zoneIds.map((signalZoneId) => ({ signalZoneId, placeId })),
    });
  }

  const imageUrls = readImageUrls(formData);
  await prisma.placeImage.deleteMany({ where: { placeId } });
  if (imageUrls.length > 0) {
    await prisma.placeImage.createMany({
      data: imageUrls.map((url, order) => ({ url, order, placeId })),
    });
  }

  await savePhotoEdits(placeId, formData);

  updateTag("corpus");
  return { id: placeId };
}

export async function uploadPlacePhoto(
  placeId: string,
  formData: FormData,
): Promise<{ id: string; src: string } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof Blob) || !isPlacePhotoType(file.type)) {
    return { error: "La photo doit être un JPEG, PNG ou WebP" };
  }
  if (file.size > MAX_PHOTO_BYTES) return { error: "La photo dépasse 4 Mo" };
  const credit = String(formData.get("credit") ?? "").trim() || null;

  const place = await prisma.place.findUnique({ where: { id: placeId }, select: { id: true } });
  if (!place) return { error: "Lieu introuvable" };

  const key = placePhotoKey(placeId, file.type);
  await putPlacePhoto(key, new Uint8Array(await file.arrayBuffer()), file.type);

  const last = await prisma.placePhoto.findFirst({
    where: { placeId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const photo = await prisma.placePhoto.create({
    data: { placeId, key, credit, order: (last?.order ?? -1) + 1 },
  });

  updateTag("corpus");
  return { id: photo.id, src: placePhotoUrl(photo.key) };
}
