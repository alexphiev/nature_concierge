import { z } from "zod";
import type { ClaimType, ContributionType } from "../../prisma/generated/client";

export const TIP_THEMES: { value: ClaimType; label: string }[] = [
  { value: "ACCESS", label: "Accès" },
  { value: "PRACTICAL", label: "Infos pratiques" },
  { value: "CROWDING", label: "Affluence" },
  { value: "SUITABILITY", label: "Pour qui" },
  { value: "ACTIVITY", label: "Activités" },
  { value: "NATURE", label: "Faune & flore" },
  { value: "SAFETY", label: "Sécurité" },
  { value: "AVOID", label: "À éviter" },
  { value: "TIP", label: "Astuce" },
];

const themeValues = TIP_THEMES.map((t) => t.value) as [ClaimType, ...ClaimType[]];

export const TipInputSchema = z.object({
  claimType: z.enum(themeValues).default("TIP"),
  text: z.string().trim().min(10).max(500),
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
