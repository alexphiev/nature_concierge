import { ClaimItem } from "./ClaimItem";
import type { Claim } from "../../prisma/generated/client";

export function ClaimList({ claims }: { claims: Claim[] }) {
  if (claims.length === 0) return null;

  return (
    <section aria-label="Le conseil du guide" className="flex flex-col gap-3">
      <h2 className="font-display text-2xl">Le conseil du guide</h2>
      {claims.map((claim) => (
        <ClaimItem key={claim.id} claim={claim} />
      ))}
    </section>
  );
}
