import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { ClaimKind } from "../../../prisma/generated/client";
import { getSessionUser } from "@/src/auth/session";
import { TYPE_LABELS } from "@/src/components/PlaceCard";
import { ContributionShell } from "@/src/components/contribute/ContributionShell";
import { TipForm } from "@/src/components/contribute/TipForm";
import { TIP_KIND_COPY } from "@/src/contributions/schema";
import { getPlaceBySlug } from "@/src/corpus/queries";

async function TipFormWithSession({ slug, kind }: { slug: string; kind: ClaimKind }) {
  const user = await getSessionUser();
  return <TipForm slug={slug} kind={kind} user={user} />;
}

export async function TipPage({ slug, kind }: { slug: string; kind: ClaimKind }) {
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  return (
    <ContributionShell
      eyebrow={`${TYPE_LABELS[place.type] ?? place.type} · ${place.commune}`}
      title={TIP_KIND_COPY[kind].title(place.name)}
    >
      <Suspense>
        <TipFormWithSession slug={slug} kind={kind} />
      </Suspense>
    </ContributionShell>
  );
}
