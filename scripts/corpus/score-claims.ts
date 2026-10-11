import { prisma } from "../../src/corpus/db";
import { scoreClaim, type ScorableClaim } from "../../src/corpus/claim-scoring";
import type { Prisma } from "../../prisma/generated/client";

type PendingDraftClaim = ScorableClaim & { id: string; resolution: string; qualityScore?: number | null };

const counts = { scored: 0, same: 0, different: 0 };

// Returns the new score only when the claim had none; existing scores are never overwritten.
async function evaluate(
  label: string,
  placeName: string,
  claim: ScorableClaim,
  current: number | null | undefined,
): Promise<number | null> {
  const score = await scoreClaim(placeName, claim);
  if (current == null) {
    counts.scored++;
    console.log(`NOTÉ   ${label} · ${score}/10 · ${claim.claimText}`);
    return score;
  }
  if (score === current) {
    counts.same++;
  } else {
    counts.different++;
    console.log(`DIFF   ${label} · ${current} → ${score} (non modifié) · ${claim.claimText}`);
  }
  return null;
}

async function main() {
  const claims = await prisma.claim.findMany({ include: { place: { select: { name: true } } } });
  for (const claim of claims) {
    const score = await evaluate(`claim ${claim.id}`, claim.place.name, claim, claim.qualityScore);
    if (score !== null) {
      await prisma.claim.update({ where: { id: claim.id }, data: { qualityScore: score } });
    }
  }

  const blocks = await prisma.ingestionBlock.findMany({
    select: { id: true, draftClaims: true, draft: { select: { place: { select: { name: true } } } } },
  });
  for (const block of blocks) {
    const draftClaims = block.draftClaims as unknown as PendingDraftClaim[];
    let changed = false;
    for (const claim of draftClaims) {
      if (claim.resolution !== "pending") continue;
      const score = await evaluate(`brouillon ${claim.id}`, block.draft.place.name, claim, claim.qualityScore);
      if (score !== null) {
        claim.qualityScore = score;
        changed = true;
      }
    }
    if (changed) {
      await prisma.ingestionBlock.update({
        where: { id: block.id },
        data: { draftClaims: draftClaims as unknown as Prisma.InputJsonValue },
      });
    }
  }

  console.log(`\n${counts.scored} notée(s) · ${counts.same} identique(s) · ${counts.different} divergente(s)`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
