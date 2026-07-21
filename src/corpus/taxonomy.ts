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

export const REQUEST_TYPES = [
  "baignade",
  "randonnee",
  "calme",
  "paysage",
  "en-famille",
] as const;

export const ConditionSchema = z.enum(CONDITIONS);
export const AudienceSchema = z.enum(AUDIENCES);
export const RequestTypeSchema = z.enum(REQUEST_TYPES);
