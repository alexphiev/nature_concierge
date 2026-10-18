import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSessionUser } from "@/src/auth/session";
import { TYPE_LABELS } from "@/src/components/PlaceCard";
import { ContributionShell } from "@/src/components/contribute/ContributionShell";
import { CorrectionForm } from "@/src/components/contribute/CorrectionForm";
import { getActivePlaces, getPlaceBySlug } from "@/src/corpus/queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const places = await getActivePlaces();
  const params = places.map((place) => ({ slug: place.slug }));
  // cacheComponents rejects an empty list; the placeholder resolves to notFound().
  return params.length > 0 ? params : [{ slug: "_" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) return {};
  return {
    title: `Signaler une erreur — ${place.name}`,
    robots: { index: false },
  };
}

async function FormWithSession({ slug }: { slug: string }) {
  const user = await getSessionUser();
  return <CorrectionForm slug={slug} claimId={null} user={user} />;
}

export default async function ReportErrorPage({ params }: Props) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  return (
    <ContributionShell
      eyebrow={`${TYPE_LABELS[place.type] ?? place.type} · ${place.commune}`}
      title={`Une erreur sur ${place.name} ?`}
    >
      <Suspense>
        <FormWithSession slug={slug} />
      </Suspense>
    </ContributionShell>
  );
}
