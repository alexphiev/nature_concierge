import type { ClaimKind, ClaimType, Verification } from "../../prisma/generated/client";

// A claim is either a practical info (formal, factual, checkable against a
// source: hours, prices, rules, how to get there) or a lived tip (what a
// local learned on the spot: when to go, where the shade is, what to avoid).

export const CLAIM_KIND_LABELS: Record<ClaimKind, string> = {
  PRACTICAL_INFO: "Infos pratiques",
  LOCAL_TIP: "Conseils vécus",
};

// Themes that are about someone's experience, whatever the source.
const LIVED_TYPES: ClaimType[] = ["TIP", "CROWDING", "AVOID", "ALTERNATIVE"];
// Themes that are about how the place works.
const FACT_TYPES: ClaimType[] = ["PRACTICAL", "DECODING"];
// Source types that come from a person being there.
const LIVED_SOURCES = ["PERSONAL_VISIT", "LOCAL_PERSON", "OT_CONVERSATION", "contribution"];

// Prices, hours, dates, phone numbers, coordinates, bookings, rules.
const FACT_PATTERNS: RegExp[] = [
  /\d+(?:[.,]\d+)?\s?€/,
  /\b\d{1,2}\s?h(?:\s?\d{2})?\b/i,
  /\b(?:du|le)\s+1er\b|\b\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/i,
  /\b0\d(?:[\s.]?\d{2}){4}\b/,
  /\b\d{2}\.\d{4,}\s*,\s*\d{1,2}\.\d{4,}\b/,
  words("tarifs?", "horaires?", "ouverte?s?", "fermée?s?", "réservation", "obligatoires?", "interdite?s?", "autorisée?s?", "navettes?", "coordonnées", "GPS"),
];

// First-person or advisory voice.
const LIVED_PATTERNS: RegExp[] = [
  words("je", "on", "nous", "perso"),
  /(?<![\p{L}\d])j['’]\p{L}/iu,
  words("évitez", "préférez", "visez", "pensez à", "arrivez", "mieux vaut", "il vaut mieux", "à éviter"),
];

// Whole-word match that also works with accented letters (\b is ASCII-only).
function words(...alternatives: string[]): RegExp {
  return new RegExp(`(?<![\\p{L}\\d])(?:${alternatives.join("|")})(?![\\p{L}\\d])`, "iu");
}

export type ClaimKindInput = {
  claimType: ClaimType;
  claimText: string;
  verification: Verification;
  sourceType: string | null;
};

export type ClaimKindGuess = { kind: ClaimKind; reason: string };

export function guessClaimKind(claim: ClaimKindInput): ClaimKindGuess {
  if (LIVED_TYPES.includes(claim.claimType)) {
    return { kind: "LOCAL_TIP", reason: `thème ${claim.claimType}` };
  }
  if (claim.verification === "OFFICIAL" || claim.sourceType === "OFFICIAL") {
    return { kind: "PRACTICAL_INFO", reason: "source officielle" };
  }
  if (FACT_TYPES.includes(claim.claimType)) {
    return { kind: "PRACTICAL_INFO", reason: `thème ${claim.claimType}` };
  }
  if (LIVED_PATTERNS.some((pattern) => pattern.test(claim.claimText))) {
    return { kind: "LOCAL_TIP", reason: "ton de conseil" };
  }
  if (FACT_PATTERNS.some((pattern) => pattern.test(claim.claimText))) {
    return { kind: "PRACTICAL_INFO", reason: "fait vérifiable (prix, horaire, règle…)" };
  }
  if (claim.sourceType && LIVED_SOURCES.includes(claim.sourceType)) {
    return { kind: "LOCAL_TIP", reason: `source ${claim.sourceType}` };
  }
  return { kind: "PRACTICAL_INFO", reason: "par défaut (description factuelle)" };
}

// Default kind for a claim created from an ingestion draft.
export function defaultKindForVerification(verification: Verification): ClaimKind {
  return verification === "OFFICIAL" ? "PRACTICAL_INFO" : "LOCAL_TIP";
}
