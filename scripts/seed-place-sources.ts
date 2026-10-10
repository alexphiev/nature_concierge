import { prisma } from "../src/corpus/db";

const SEED_COUNT = 5;
const AI_ONLY_CONFIG = { version: 1, rules: [], ai: { mode: "fallback" } };

async function main() {
  const places = await prisma.place.findMany({
    where: { status: "ACTIVE", officialInfoUrl: { not: null } },
    orderBy: { demandRank: "asc" },
    take: SEED_COUNT,
  });

  for (const place of places) {
    const url = place.officialInfoUrl!;
    const existing = await prisma.placeStatusSource.findUnique({
      where: { placeId_url: { placeId: place.id, url } },
    });
    if (!existing) {
      await prisma.placeStatusSource.create({
        data: { placeId: place.id, url, label: "Site officiel", config: AI_ONLY_CONFIG },
      });
    }
    console.log(`status:seed — ${existing ? "exists " : "created"} ${place.name} → ${url}`);
  }
  console.log(`status:seed — ${places.length} places processed`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
