import { z } from "zod";

export const CONDITIONS = [
  "ete",
  "hiver",
  "dimanche",
  "mistral",
  "code-rouge",
  "canicule",
] as const;

export const AUDIENCES = [
  "famille-jeunes-enfants",
  "pmr",
  "chiens",
  "sans-voiture",
  "seniors",
  "sportifs",
  "tous",
] as const;

export const ConditionSchema = z.enum(CONDITIONS);
export const AudienceSchema = z.enum(AUDIENCES);
