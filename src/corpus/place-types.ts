import type { Place } from "../../prisma/generated/client";

export const TYPE_LABELS: Record<Place["type"], string> = {
  CALANQUE: "Calanque",
  PLAGE: "Plage",
  MASSIF: "Massif",
  SENTIER: "Sentier",
  SOMMET: "Sommet",
  SITE: "Site",
  ISLAND: "Île",
  SCENIC_ROAD: "Route touristique",
};
