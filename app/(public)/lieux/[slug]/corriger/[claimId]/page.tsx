import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSessionUser } from "@/src/auth/session";
import { TYPE_LABELS } from "@/src/components/PlaceCard";
import { ContributionShell } from "@/src/components/contribute/ContributionShell";
import { CorrectionForm } from "@/src/components/contribute/CorrectionForm";
import { getActivePlaces, getPlaceBySlug } from "@/src/corpus/queries";

type Props = { params: Promise<{ slug: string; claimId: string }> };

export async function generateStaticParams() {
  const places = await getActivePlaces();
  const full = await Promise.all(places.map((place) => getPlaceBySlug(place.slug)));
  const params = full.flatMap((place) =>
    place
      ? [...place.claims, ...(place.parent?.claims ?? [])].map((claim) => ({
          slug: place.slug,
          claimId: claim.id,
        }))
      : [],
  );
  return params.length > 0 ? params : [{ slug: "_", claimId: "_" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) return {};
  return {
    title: `Corriger un conseil — ${place.name}`,
    robots: { index: false },
  };
}

async function FormWithSession({
  slug,
  claimId,
  claimText,
}: {
  slug: string;
  claimId: string;
  claimText: string;
}) {
  const user = await getSessionUser();
  return <CorrectionForm slug={slug} claimId={claimId} claimText={claimText} user={user} />;
}

export default async function CorrectClaimPage({ params }: Props) {
  const { slug, claimId } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  const claim = [...place.claims, ...(place.parent?.claims ?? [])].find((c) => c.id === claimId);
  if (!claim) notFound();

  return (
    <ContributionShell
      eyebrow={`${TYPE_LABELS[place.type] ?? place.type} · ${place.commune}`}
      title="Corriger un conseil"
    >
      <Suspense>
        <FormWithSession slug={slug} claimId={claim.id} claimText={claim.claimText} />
      </Suspense>
    </ContributionShell>
  );
}
