import type { Claim } from "../../prisma/generated/client";

const THEME_LABELS: Record<Claim["claimType"], string> = {
  ACCESS: "Accès",
  CROWDING: "Affluence",
  SUITABILITY: "Pour qui",
  TIP: "Astuce",
  AVOID: "À éviter",
  ALTERNATIVE: "Alternative",
  DECODING: "Décryptage",
};

const THEME_ORDER = Object.keys(THEME_LABELS) as Claim["claimType"][];

// Stroke paths for a 24×24 icon, one per claim theme.
const THEME_ICONS: Record<Claim["claimType"], string> = {
  ACCESS: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  CROWDING: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.8-1.8-5.1-4.3-5.8",
  SUITABILITY: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 14.5c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8M9 9.5h.01M15 9.5h.01",
  TIP: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z",
  AVOID: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8",
  ALTERNATIVE: "M7 7h11l-3-3M17 17H6l3 3",
  DECODING: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
};

export function ClaimList({
  claims,
  title = "Le conseil du guide",
}: {
  claims: Claim[];
  title?: string;
}) {
  if (claims.length === 0) return null;

  const sorted = [...claims].sort(
    (a, b) => THEME_ORDER.indexOf(a.claimType) - THEME_ORDER.indexOf(b.claimType),
  );

  return (
    <section aria-label={title} className="flex flex-col gap-6">
      <h2 className="font-display text-[1.625rem] leading-tight font-semibold">{title}</h2>
      <ul className="flex flex-col gap-5">
        {sorted.map((claim) => (
          <li key={claim.id} className="grid grid-cols-[40px_minmax(0,1fr)] gap-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-calcaire-deep text-pin">
              <svg
                aria-hidden
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={THEME_ICONS[claim.claimType]} />
              </svg>
            </span>
            <div>
              <p className="font-mono text-[0.6875rem] tracking-wider text-pin uppercase">
                {THEME_LABELS[claim.claimType]}
              </p>
              <p className="mt-1 leading-relaxed">{claim.claimText}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
