import type { ClaimKind, ClaimType } from "../../prisma/generated/client";

// The guide asks precise questions instead of showing an empty page: answering
// one is easier than writing on a blank form. A question disappears once the
// place has a claim of that kind and theme.

export const NEED_QUESTIONS: Record<ClaimKind, Partial<Record<ClaimType, string>>> = {
  PRACTICAL_INFO: {
    ACCESS: "Comment y accède-t-on, et où se garer ?",
    PRACTICAL: "Y a-t-il des toilettes, de l'eau, un endroit où manger ?",
    SUITABILITY: "Est-ce accessible en poussette ou en fauteuil ?",
  },
  LOCAL_TIP: {
    TIP: "Quel est le meilleur moment pour y aller ?",
    CROWDING: "Quand y a-t-il du monde, et quand est-ce calme ?",
    SUITABILITY: "Bonne idée avec des enfants ? Avec un chien ?",
    AVOID: "Qu'auriez-vous aimé savoir avant d'y aller ?",
  },
};

// Shown on cards of places nobody has written about yet.
export const FIRST_TIP_WELCOME = "Premiers conseils bienvenus";

// Below this many claims of a kind, the place asks for help on that kind.
export const WELL_COVERED = 3;
const MAX_QUESTIONS = 3;

export type PlaceNeed = { kind: ClaimKind; theme: ClaimType; question: string };

export type PlaceNeeds = {
  practicalCount: number;
  tipCount: number;
  questions: PlaceNeed[];
  wantsPhotos: boolean;
};

export function placeNeeds({
  claims,
  ownPhotoCount,
}: {
  claims: { kind: ClaimKind; claimType: ClaimType }[];
  ownPhotoCount: number;
}): PlaceNeeds {
  const practicalCount = claims.filter((claim) => claim.kind === "PRACTICAL_INFO").length;
  const tipCount = claims.length - practicalCount;
  const covered = new Set(claims.map((claim) => `${claim.kind}:${claim.claimType}`));

  const candidates: PlaceNeed[] = [];
  // Lived tips first: they are what the guide is for and what nobody else has.
  for (const kind of ["LOCAL_TIP", "PRACTICAL_INFO"] as const) {
    const count = kind === "LOCAL_TIP" ? tipCount : practicalCount;
    if (count >= WELL_COVERED) continue;
    for (const [theme, question] of Object.entries(NEED_QUESTIONS[kind])) {
      if (!covered.has(`${kind}:${theme}`)) {
        candidates.push({ kind, theme: theme as ClaimType, question });
      }
    }
  }

  // Alternate kinds so both kinds of help get asked for.
  const tips = candidates.filter((need) => need.kind === "LOCAL_TIP");
  const infos = candidates.filter((need) => need.kind === "PRACTICAL_INFO");
  const questions: PlaceNeed[] = [];
  while (questions.length < MAX_QUESTIONS && (tips.length > 0 || infos.length > 0)) {
    const next = (questions.length % 2 === 0 ? tips.shift() : infos.shift()) ?? tips.shift() ?? infos.shift();
    if (next) questions.push(next);
  }

  return {
    practicalCount,
    tipCount,
    questions,
    wantsPhotos: ownPhotoCount === 0,
  };
}

export function needsHelp(needs: PlaceNeeds): boolean {
  return needs.questions.length > 0;
}
