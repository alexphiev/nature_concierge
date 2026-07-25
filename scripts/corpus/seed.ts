import { discoverPlaceFiles } from "./discover-places";
import { validatePlaceFile } from "../../src/corpus/schema";
import { prisma } from "../../src/corpus/db";
import { SIGNAL_SOURCES } from "../../src/corpus/signal-sources";

async function main() {
  const places = await discoverPlaceFiles();
  const slugs = new Set(places.map((p) => p.slug));

  for (const place of places) {
    const result = validatePlaceFile(place, slugs);
    if (result.errors.length > 0) {
      console.error(`✗ ${place.slug} failed validation — aborting seed`);
      for (const e of result.errors) console.error(`  - ${e}`);
      process.exit(1);
    }
  }

  let placesUpserted = 0;
  let claimsUpserted = 0;

  for (const place of places) {
    const dbPlace = await prisma.place.upsert({
      where: { slug: place.slug },
      create: {
        slug: place.slug,
        name: place.name,
        commune: place.commune,
        departement: place.departement,
        lat: place.lat,
        lng: place.lng,
        type: place.type,
        governingAuthority: place.governingAuthority,
        officialInfoUrl: place.officialInfoUrl,
        description: place.description,
        demandRank: place.demandRank,
        zapef: place.zapef,
        status: "ACTIVE",
      },
      update: {
        name: place.name,
        commune: place.commune,
        departement: place.departement,
        lat: place.lat,
        lng: place.lng,
        type: place.type,
        governingAuthority: place.governingAuthority,
        officialInfoUrl: place.officialInfoUrl,
        description: place.description,
        demandRank: place.demandRank,
        zapef: place.zapef,
      },
    });
    placesUpserted++;

    const sourceIdByKey = new Map<string, string>();
    for (const [key, source] of Object.entries(place.sources)) {
      const dbSource = await prisma.source.create({
        data: {
          type: source.type,
          urlOrRef: source.urlOrRef,
          dateCollected: new Date(source.dateCollected),
          reliability: source.reliability,
          notes: source.notes,
        },
      });
      sourceIdByKey.set(key, dbSource.id);
    }

    for (const claim of place.claims) {
      const sourceId = sourceIdByKey.get(claim.source);
      if (!sourceId) continue; // guarded by validatePlaceFile above

      let alternativePlaceId: string | undefined;
      if (claim.alternativePlaceSlug) {
        const alt = await prisma.place.findUnique({
          where: { slug: claim.alternativePlaceSlug },
        });
        alternativePlaceId = alt?.id;
      }

      const existing = await prisma.claim.findFirst({
        where: { placeId: dbPlace.id, claimText: claim.claimText },
      });

      const claimData = {
        placeId: dbPlace.id,
        claimText: claim.claimText,
        claimType: claim.claimType,
        conditions: claim.conditions,
        audience: claim.audience,
        verdict: claim.verdict,
        alternativePlaceId,
        sourceId,
        verification: claim.verification,
        decayClass: claim.decayClass,
        verifiedOn: new Date(claim.verifiedOn),
        isPublic: claim.isPublic,
      };

      if (existing) {
        await prisma.claim.update({ where: { id: existing.id }, data: claimData });
      } else {
        await prisma.claim.create({ data: { ...claimData, status: "PUBLISHED" as const } });
      }
      claimsUpserted++;
    }
  }

  let signalSourcesUpserted = 0;
  let signalZonesUpserted = 0;

  for (const source of SIGNAL_SOURCES) {
    const dbSource = await prisma.signalSource.upsert({
      where: { provider_signalType: { provider: source.provider, signalType: source.signalType } },
      create: {
        signalType: source.signalType,
        provider: source.provider,
        url: source.url,
        updateSchedule: source.updateSchedule,
        format: source.format,
      },
      update: {
        url: source.url,
        updateSchedule: source.updateSchedule,
        format: source.format,
      },
    });
    signalSourcesUpserted++;

    for (const zone of source.zones) {
      await prisma.signalZone.upsert({
        where: { signalSourceId_label: { signalSourceId: dbSource.id, label: zone.label } },
        create: {
          signalSourceId: dbSource.id,
          label: zone.label,
          externalRef: zone.externalRef,
          parseNotes: zone.parseNotes,
        },
        update: {
          externalRef: zone.externalRef,
          parseNotes: zone.parseNotes,
        },
      });
      signalZonesUpserted++;
    }
  }

  const sainteBaumeZone = await prisma.signalZone.findFirst({
    where: { label: "SAINTE BAUME" },
  });
  const portDAlon = await prisma.place.findUnique({ where: { slug: "port-d-alon" } });
  if (sainteBaumeZone && portDAlon) {
    await prisma.zonePlace.upsert({
      where: { signalZoneId_placeId: { signalZoneId: sainteBaumeZone.id, placeId: portDAlon.id } },
      create: { signalZoneId: sainteBaumeZone.id, placeId: portDAlon.id },
      update: {},
    });
  }

  console.log(
    `corpus:seed done — ${placesUpserted} place(s), ${claimsUpserted} claim(s), ${signalSourcesUpserted} signal source(s), ${signalZonesUpserted} signal zone(s)`,
  );
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
