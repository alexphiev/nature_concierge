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

export function ClaimList({
  claims,
  title = "Le conseil du guide",
}: {
  claims: Claim[];
  title?: string;
}) {
  if (claims.length === 0) return null;

  const grouped = new Map<Claim["claimType"], Claim[]>();
  for (const claim of claims) {
    const bucket = grouped.get(claim.claimType) ?? [];
    bucket.push(claim);
    grouped.set(claim.claimType, bucket);
  }

  return (
    <section aria-label={title}>
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-5 flex flex-col gap-6">
        {Array.from(grouped.entries()).map(([claimType, themeClaims]) => (
          <div key={claimType}>
            <p className="mb-2.5 flex items-center gap-2 font-mono text-[0.7rem] tracking-wide text-pin uppercase after:h-px after:flex-1 after:bg-sable/35 after:content-['']">
              {THEME_LABELS[claimType]}
            </p>
            <div className="flex flex-col gap-3">
              {themeClaims.map((claim) => (
                <ClaimItemBare key={claim.id} claim={claim} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClaimItemBare({ claim }: { claim: Claim }) {
  return (
    <p className="border-l-2 border-sable/35 pl-4 leading-relaxed">
      {claim.claimText}
    </p>
  );
}
