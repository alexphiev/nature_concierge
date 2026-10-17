import type { Metadata } from "next";
import { Suspense } from "react";
import { getSessionUser } from "@/src/auth/session";
import { ContributionShell } from "@/src/components/contribute/ContributionShell";
import { PlaceProposalForm } from "@/src/components/contribute/PlaceProposalForm";

export const metadata: Metadata = {
  title: "Proposer un lieu",
  robots: { index: false },
};

async function PlaceProposalFormWithSession() {
  const user = await getSessionUser();
  return <PlaceProposalForm user={user} />;
}

export default function NewPlacePage() {
  return (
    <ContributionShell eyebrow="Nouveau lieu" title="Proposer un lieu">
      <Suspense>
        <PlaceProposalFormWithSession />
      </Suspense>
    </ContributionShell>
  );
}
