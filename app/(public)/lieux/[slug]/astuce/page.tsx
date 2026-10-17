import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSessionUser } from "@/src/auth/session";
import { TYPE_LABELS } from "@/src/components/PlaceCard";
import { ContributionShell } from "@/src/components/contribute/ContributionShell";
import { TipForm } from "@/src/components/contribute/TipForm";
import { getActivePlaces, getPlaceBySlug } from "@/src/corpus/queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const places = await getActivePlaces();
  return places.map((place) => ({ slug: place.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) return {};
  return {
    title: `Ajouter une astuce — ${place.name}`,
    robots: { index: false },
  };
}

async function TipFormWithSession({ slug }: { slug: string }) {
  const user = await getSessionUser();
  return <TipForm slug={slug} user={user} />;
}

export default async function TipPage({ params }: Props) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  return (
    <ContributionShell
      eyebrow={`${TYPE_LABELS[place.type] ?? place.type} · ${place.commune}`}
      title={`Une astuce sur ${place.name}`}
    >
      <Suspense>
        <TipFormWithSession slug={slug} />
      </Suspense>
    </ContributionShell>
  );
}
