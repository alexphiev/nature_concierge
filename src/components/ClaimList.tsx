import Link from "next/link";
import type { Claim } from "../../prisma/generated/client";
import type { PublicClaim } from "@/src/corpus/queries";
import { GUIDE_AUTHOR } from "@/src/site";

const monthYear = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

export function claimMeta(claim: PublicClaim): string {
  const author = claim.authorDeleted ? null : (claim.author ?? GUIDE_AUTHOR);
  const parts = claim.authorDeleted
    ? ["Un ancien contributeur"]
    : [author?.name, author?.commune].filter((part): part is string =>
        Boolean(part),
      );
  return [...parts, monthYear.format(claim.verifiedOn)].join(" · ");
}

function authorInitial(claim: PublicClaim): string {
  if (claim.authorDeleted) return "·";
  const name = (claim.author ?? GUIDE_AUTHOR)?.name?.trim();
  return name ? name.charAt(0).toUpperCase() : "A";
}

export const ADD_TIP_LINK =
  "inline-flex self-start rounded-[10px] border border-sable/70 px-4 py-2.5 text-sm font-medium text-encre transition-colors hover:border-mediterranee hover:text-mediterranee";

export const THEME_ORDER: Claim["claimType"][] = [
  "ACCESS",
  "PRACTICAL",
  "ACTIVITY",
  "NATURE",
  "CROWDING",
  "SUITABILITY",
  "TIP",
  "SAFETY",
  "AVOID",
  "ALTERNATIVE",
  "DECODING",
];

export const THEME_LABELS: Record<Claim["claimType"], string> = {
  ACCESS: "Accès",
  PRACTICAL: "Horaires & services",
  ACTIVITY: "Activités",
  NATURE: "Faune & flore",
  CROWDING: "Affluence",
  SUITABILITY: "Pour qui",
  TIP: "Astuces",
  SAFETY: "Sécurité",
  AVOID: "À éviter",
  ALTERNATIVE: "Alternatives",
  DECODING: "Décryptage",
};

const NEUTRAL_ACCENT = {
  badge: "bg-calcaire-deep text-pin",
  label: "text-pin",
  card: "border-l-4 border-l-pin/30 bg-[#FFFCF6]",
};
const RISK_ACCENT = {
  badge: "bg-statut-rouge/10 text-statut-rouge",
  label: "text-statut-rouge",
  card: "border-l-4 border-l-statut-rouge/60 bg-[#FFF8F5]",
};

// Most themes stay neutral; risk and redirect themes get an accent so they stand out.
export const THEME_ACCENTS: Record<
  Claim["claimType"],
  { badge: string; label: string; card: string }
> = {
  ACCESS: NEUTRAL_ACCENT,
  PRACTICAL: NEUTRAL_ACCENT,
  ACTIVITY: NEUTRAL_ACCENT,
  NATURE: NEUTRAL_ACCENT,
  CROWDING: NEUTRAL_ACCENT,
  SUITABILITY: NEUTRAL_ACCENT,
  TIP: NEUTRAL_ACCENT,
  SAFETY: RISK_ACCENT,
  AVOID: RISK_ACCENT,
  ALTERNATIVE: {
    badge: "bg-mediterranee/10 text-mediterranee",
    label: "text-mediterranee",
    card: "border-l-4 border-l-mediterranee/60 bg-[#FAFCFB]",
  },
  DECODING: NEUTRAL_ACCENT,
};

// Stroke paths for a 24×24 icon, one per claim theme.
export const THEME_ICONS: Record<Claim["claimType"], string> = {
  ACCESS: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  PRACTICAL:
    "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM10 17V8h3a2.5 2.5 0 0 1 0 5h-3",
  ACTIVITY: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z",
  NATURE: "M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l7-7",
  CROWDING:
    "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.8-1.8-5.1-4.3-5.8",
  SUITABILITY:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 14.5c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8M9 9.5h.01M15 9.5h.01",
  TIP: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z",
  SAFETY: "M12 4L2.5 20h19zM12 10v4M12 17h.01",
  AVOID: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8",
  ALTERNATIVE: "M7 7h11l-3-3M17 17H6l3 3",
  DECODING: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
};

export function ThemeIcon({ type, className }: { type: Claim["claimType"]; className: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full ${className}`}>
      <svg
        aria-hidden
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={THEME_ICONS[type]} />
      </svg>
    </span>
  );
}

export function groupByTheme<T extends { claimType: Claim["claimType"] }>(claims: T[]) {
  return THEME_ORDER.map((type) => ({
    type,
    claims: claims.filter((claim) => claim.claimType === type),
  })).filter((group) => group.claims.length > 0);
}

// Lived tips: informal, signed advice from people who have been there.
export function ClaimList({
  claims,
  title = "Conseils vécus",
  subtitle,
  addTipHref,
  correctHref,
}: {
  claims: PublicClaim[];
  title?: string;
  subtitle?: string;
  addTipHref?: string;
  correctHref?: (claimId: string) => string;
}) {
  if (claims.length === 0) return null;

  const groups = groupByTheme(claims);

  return (
    <section aria-label={title} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-[1.625rem] leading-tight font-semibold">{title}</h2>
        {subtitle && <p className="text-sm leading-relaxed text-encre/70">{subtitle}</p>}
      </div>
      <div className="@container flex flex-col gap-8">
        {groups.map(({ type, claims: groupClaims }) => {
          const accent = THEME_ACCENTS[type];
          return (
            <section key={type} aria-label={THEME_LABELS[type]} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <ThemeIcon type={type} className={`size-9 ${accent.badge}`} />
                <h3 className={`text-xs font-semibold tracking-wider uppercase ${accent.label}`}>
                  {THEME_LABELS[type]}
                  <span className="ml-1.5 text-encre/60">{groupClaims.length}</span>
                </h3>
                <span aria-hidden className="h-px flex-1 bg-sable/40" />
              </div>
              <ul className="grid grid-cols-1 items-start gap-3 @xl:grid-cols-2">
                {groupClaims.map((claim) => (
                  <li
                    key={claim.id}
                    className={`flex flex-col gap-4 rounded-[14px] border border-sable/40 p-4 sm:p-5 ${accent.card}`}
                  >
                    <p className="max-w-[65ch] text-base leading-relaxed text-pretty">
                      {claim.claimText}
                    </p>
                    <div className="flex items-center gap-2.5 border-t border-sable/30 pt-3">
                      <span
                        aria-hidden
                        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-calcaire-deep font-display text-xs font-semibold text-pin"
                      >
                        {authorInitial(claim)}
                      </span>
                      <span className="min-w-0 flex-1 text-xs leading-snug text-encre/70">
                        {claimMeta(claim)}
                      </span>
                      {correctHref && (
                        <Link
                          href={correctHref(claim.id)}
                          className="-my-2 -mr-2 inline-flex min-h-8 shrink-0 items-center rounded-md px-2 text-xs text-mediterranee hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
                        >
                          Corriger
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {addTipHref && (
        <Link href={addTipHref} className={ADD_TIP_LINK}>
          Partager un conseil
        </Link>
      )}
    </section>
  );
}
