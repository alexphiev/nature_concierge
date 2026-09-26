import type { Claim } from "../../prisma/generated/client";

const THEME_ORDER: Claim["claimType"][] = [
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

const THEME_LABELS: Record<Claim["claimType"], string> = {
  ACCESS: "Accès",
  PRACTICAL: "Infos pratiques",
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
};
const RISK_ACCENT = {
  badge: "bg-statut-rouge/10 text-statut-rouge",
  label: "text-statut-rouge",
};

// Most themes stay neutral; risk and redirect themes get an accent so they stand out.
const THEME_ACCENTS: Record<
  Claim["claimType"],
  { badge: string; label: string }
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
  },
  DECODING: NEUTRAL_ACCENT,
};

// Stroke paths for a 24×24 icon, one per claim theme.
const THEME_ICONS: Record<Claim["claimType"], string> = {
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

export function ClaimList({
  claims,
  title = "Conseils du guide",
}: {
  claims: Claim[];
  title?: string;
}) {
  if (claims.length === 0) return null;

  const groups = THEME_ORDER.map((type) => ({
    type,
    claims: claims.filter((claim) => claim.claimType === type),
  })).filter((group) => group.claims.length > 0);

  return (
    <section aria-label={title} className="flex flex-col gap-6">
      <h2 className="font-display text-[1.625rem] leading-tight font-semibold">
        {title}
      </h2>
      <ul className="columns-1 gap-3 sm:columns-2">
        {groups.map(({ type, claims: groupClaims }) => {
          const accent = THEME_ACCENTS[type];
          return (
            <li
              key={type}
              className="mb-3 break-inside-avoid rounded-[14px] border border-sable/40 p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full ${accent.badge}`}
                >
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
                <h3
                  className={`font-mono text-[0.6875rem] tracking-wider uppercase ${accent.label}`}
                >
                  {THEME_LABELS[type]}
                  <span className="ml-1.5 text-sable">
                    {groupClaims.length}
                  </span>
                </h3>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {groupClaims.map((claim) => (
                  <li
                    key={claim.id}
                    className="relative pl-4 leading-relaxed before:absolute before:top-[0.7em] before:left-0 before:size-1.5 before:rounded-full before:bg-sable"
                  >
                    {claim.claimText}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
