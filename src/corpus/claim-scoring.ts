import { TypeSafeClient } from "@typesafe-ai/sdk";
import { CLAIM_IS_USEFUL } from "../search/jev/questions";

export type ScorableClaim = { claimText: string; claimType: string; conditions: string[] };

// Lazy: the constructor throws without TYPESAFE_API_KEY, which would break builds.
let client: TypeSafeClient | null = null;

export async function scoreClaim(placeName: string, claim: ScorableClaim): Promise<number> {
  client ??= new TypeSafeClient();
  const { answers } = await client.systemOne({
    state: {
      place: placeName,
      claim: { text: claim.claimText, type: claim.claimType, conditions: claim.conditions },
    },
    questions: { useful: CLAIM_IS_USEFUL },
  });
  return Math.round(answers.useful.noul * 10);
}
