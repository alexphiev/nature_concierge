import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { ClaimKind } from "../../prisma/generated/client";
import { CLAIM_IS_PRACTICAL_INFO } from "../search/jev/questions";

export type ClassifiableClaim = { claimText: string; claimType: string };

// Lazy: the constructor throws without TYPESAFE_API_KEY, which would break builds.
let client: TypeSafeClient | null = null;

// Asks Jev whether a claim is a practical fact or a lived tip.
export async function classifyClaimKind(
  placeName: string,
  claim: ClassifiableClaim,
): Promise<{ kind: ClaimKind; confidence: number }> {
  client ??= new TypeSafeClient();
  const { answers } = await client.systemOne({
    state: { place: placeName, claim: { text: claim.claimText, theme: claim.claimType } },
    questions: { practical: CLAIM_IS_PRACTICAL_INFO },
  });
  const score = answers.practical.noul;
  return {
    kind: score >= 0.5 ? "PRACTICAL_INFO" : "LOCAL_TIP",
    confidence: Math.abs(score - 0.5) * 2,
  };
}
