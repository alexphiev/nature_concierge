import { prisma } from "../../src/corpus/db";

async function main() {
  const places = await prisma.place.findMany({
    where: { status: "ACTIVE" },
    orderBy: { demandRank: "asc" },
    include: { claims: { where: { status: "PUBLISHED" } } },
  });

  console.log("Coverage by place (demandRank → published claims):");
  for (const place of places) {
    console.log(`  ${place.demandRank}\t${place.slug}\t${place.claims.length} claim(s)`);
  }

  const verificationCounts = await prisma.claim.groupBy({
    by: ["verification"],
    _count: true,
  });
  console.log("\nVerification mix:");
  for (const row of verificationCounts) {
    console.log(`  ${row.verification}: ${row._count}`);
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const backlog = await prisma.claim.findMany({
    where: { decayClass: "SEASONAL", verifiedOn: { lt: oneYearAgo } },
    select: { claimText: true, verifiedOn: true },
  });
  console.log(`\nRe-verification backlog (SEASONAL, >1yr old): ${backlog.length}`);
  for (const c of backlog) {
    console.log(`  - ${c.claimText} (verified ${c.verifiedOn.toISOString().slice(0, 10)})`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
