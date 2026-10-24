// Sorts every claim into practical info or lived tip with Jev, and writes the
// result straight to the database.
//
//   pnpm corpus:split-kinds
//
// Every non-retired claim is reclassified, including ones whose kind was set
// by hand in the admin: run it once after the claim_kind migration.
import { prisma } from "../../src/corpus/db";
import { classifyClaimKind } from "../../src/corpus/claim-kind-ai";

async function main() {
  if (!process.env.TYPESAFE_API_KEY) {
    throw new Error("TYPESAFE_API_KEY manquant dans .env.local : Jev est nécessaire pour classer.");
  }
  const claims = await prisma.claim.findMany({
    where: { status: { not: "RETIRED" } },
    include: { place: { select: { name: true } } },
    orderBy: [{ placeId: "asc" }, { createdAt: "asc" }],
  });

  const counts = { practical: 0, tips: 0, changed: 0, failed: 0 };

  for (const claim of claims) {
    let result;
    try {
      result = await classifyClaimKind(claim.place.name, claim);
    } catch (error) {
      counts.failed++;
      console.error(`ÉCHEC   ${claim.place.name} · ${claim.claimText}`, error);
      continue;
    }

    if (result.kind === "PRACTICAL_INFO") counts.practical++;
    else counts.tips++;

    const label = result.kind === "PRACTICAL_INFO" ? "INFO   " : "CONSEIL";
    const doubt = result.confidence < 0.3 ? "  (à vérifier)" : "";
    if (result.kind !== claim.kind) {
      await prisma.claim.update({ where: { id: claim.id }, data: { kind: result.kind } });
      counts.changed++;
    }
    console.log(`${label} ${claim.place.name} · ${claim.claimText}${doubt}`);
  }

  console.log(
    `\n${claims.length} conseil(s) : ${counts.practical} infos pratiques, ${counts.tips} conseils vécus, ` +
      `${counts.changed} modifié(s)${counts.failed ? `, ${counts.failed} en échec` : ""}.`,
  );
  console.log("Pensez à revalider le cache : POST /api/revalidate avec REVALIDATE_TOKEN.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
