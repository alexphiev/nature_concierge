import { z } from "zod";
import type {
  ClaimKind,
  ClaimType,
  ContributionType,
  CorrectionKind,
} from "../../prisma/generated/client";

export const TIP_THEMES: { value: ClaimType; label: string }[] = [
  { value: "ACCESS", label: "Accès" },
  { value: "PRACTICAL", label: "Horaires & services" },
  { value: "CROWDING", label: "Affluence" },
  { value: "SUITABILITY", label: "Pour qui" },
  { value: "ACTIVITY", label: "Activités" },
  { value: "NATURE", label: "Faune & flore" },
  { value: "SAFETY", label: "Sécurité" },
  { value: "AVOID", label: "À éviter" },
  { value: "TIP", label: "Astuce" },
];

const themeValues = TIP_THEMES.map((t) => t.value) as [ClaimType, ...ClaimType[]];

export const NOTE_MAX_LENGTH = 1000;

export const SOURCE_HINT_MAX_LENGTH = 300;

export const TipInputSchema = z.object({
  kind: z.enum(["PRACTICAL_INFO", "LOCAL_TIP"]).default("LOCAL_TIP"),
  claimType: z.enum(themeValues).default("TIP"),
  text: z.string().trim().min(10).max(500),
  sourceHint: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .pipe(z.string().max(SOURCE_HINT_MAX_LENGTH).nullable()),
});

// Wording of the two contribution flows: a practical info (formal, checkable)
// or a lived tip (a local's informal advice).
export const TIP_KIND_COPY: Record<
  ClaimKind,
  {
    path: string;
    title: (placeName: string) => string;
    textLabel: string;
    textHint: string;
    defaultTheme: ClaimType;
    themes: ClaimType[];
  }
> = {
  PRACTICAL_INFO: {
    path: "info",
    title: (placeName) => `Une info pratique sur ${placeName}`,
    textLabel: "Votre info pratique",
    textHint: "Un fait vérifiable : horaires, tarif, accès, règle, équipement sur place.",
    defaultTheme: "PRACTICAL",
    themes: ["ACCESS", "PRACTICAL", "SUITABILITY", "SAFETY", "NATURE"],
  },
  LOCAL_TIP: {
    path: "astuce",
    title: (placeName) => `Un conseil sur ${placeName}`,
    textLabel: "Votre conseil",
    textHint:
      "Ce que vous avez appris sur place : l'heure à viser, où se poser, ce qu'on aurait aimé savoir.",
    defaultTheme: "TIP",
    themes: ["TIP", "CROWDING", "ACCESS", "SUITABILITY", "ACTIVITY", "NATURE", "AVOID", "SAFETY"],
  },
};

export const CORRECTION_KINDS: { value: CorrectionKind; label: string }[] = [
  { value: "OUTDATED", label: "N'est plus vrai" },
  { value: "WRONG", label: "Inexact" },
  { value: "MISSING_DETAIL", label: "Il manque une précision" },
];

const correctionKindValues = CORRECTION_KINDS.map((k) => k.value) as [
  CorrectionKind,
  ...CorrectionKind[],
];

export const CorrectionInputSchema = z.object({
  correctionKind: z.enum(correctionKindValues),
  text: z.string().trim().min(10).max(1000),
});

export const PlaceProposalSchema = z.object({
  placeName: z.string().trim().min(2).max(120),
  placeCommune: z.string().trim().min(2).max(80),
  locationHint: z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(z.string().max(500).nullable()),
  text: z.string().trim().min(10).max(1000),
});

export const DisplayNameSchema = z.string().trim().min(2).max(40);

export const CommuneSchema = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(z.string().min(2).max(80).nullable());

export const IdentitySchema = z.object({
  name: DisplayNameSchema,
  commune: CommuneSchema,
  email: z.string().trim().toLowerCase().pipe(z.email()),
  consent: z.literal("on"),
});

export const CONTRIBUTION_TYPE_LABELS: Record<ContributionType, string> = {
  TIP: "Astuce",
  CORRECTION: "Correction",
  PLACE: "Nouveau lieu",
  PHOTOS: "Photos",
};
