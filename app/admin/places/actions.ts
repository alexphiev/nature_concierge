"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/src/corpus/db";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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
    zoneIds,
  };
}

export async function createPlace(formData: FormData): Promise<void> {
  const fields = readPlaceFields(formData);
  const place = await prisma.place.create({
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
    },
  });

  if (fields.zoneIds.length > 0) {
    await prisma.zonePlace.createMany({
      data: fields.zoneIds.map((signalZoneId) => ({ signalZoneId, placeId: place.id })),
    });
  }

  redirect("/admin/places");
}

export async function updatePlace(placeId: string, formData: FormData): Promise<void> {
  const fields = readPlaceFields(formData);
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
    },
  });

  await prisma.zonePlace.deleteMany({ where: { placeId } });
  if (fields.zoneIds.length > 0) {
    await prisma.zonePlace.createMany({
      data: fields.zoneIds.map((signalZoneId) => ({ signalZoneId, placeId })),
    });
  }

  redirect("/admin/places");
}
