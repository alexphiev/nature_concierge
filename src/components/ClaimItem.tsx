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

export function ClaimItem({ claim }: { claim: Claim }) {
  return (
    <p className="text-base leading-relaxed">
      <span className="mr-2 rounded-full bg-pin/10 px-2 py-0.5 text-xs font-medium text-pin">
        {THEME_LABELS[claim.claimType]}
      </span>
      {claim.claimText}
    </p>
  );
}
