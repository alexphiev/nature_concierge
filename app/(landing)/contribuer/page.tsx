import type { Metadata } from "next";
import { Suspense } from "react";
import { ContributePage } from "@/src/components/contribute/ContributePage";
import { ContributionBanner } from "@/src/components/contribute/ContributionBanner";
import { CONTAINER } from "@/src/components/landing/shared";
import { BASE_OPEN_GRAPH } from "@/src/site";

const DESCRIPTION =
  "Ajoutez une astuce, corrigez une info, partagez vos photos ou proposez un lieu. Tout est relu avant publication.";

export const metadata: Metadata = {
  title: "Contribuer",
  description: DESCRIPTION,
  alternates: { canonical: "/contribuer" },
  openGraph: { ...BASE_OPEN_GRAPH, url: "/contribuer" },
};

export default function ContributeRoute() {
  return (
    <main>
      <div className={`${CONTAINER} pt-6 empty:hidden`}>
        <Suspense fallback={null}>
          <ContributionBanner />
        </Suspense>
      </div>
      <ContributePage />
    </main>
  );
}
