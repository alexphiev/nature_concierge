import type { Metadata } from "next";
import { LegalPage } from "@/src/components/site/LegalPage";
import { BASE_OPEN_GRAPH, CONTACT_EMAIL, SITE_NAME } from "@/src/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: `Éditeur, contact et hébergeur du ${SITE_NAME}.`,
  alternates: { canonical: "/mentions-legales" },
  openGraph: { ...BASE_OPEN_GRAPH, url: "/mentions-legales" },
};

export default function LegalNoticePage() {
  return (
    <LegalPage title="Mentions légales">
      <h2>Éditeur</h2>
      <p>
        Ce site est édité à titre non professionnel par une personne physique, conformément à
        l’article 6-III-2 de la loi pour la confiance dans l’économie numérique (LCEN). Son
        identité est communiquée à l’hébergeur.
      </p>
      <p>
        Contact : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      <h2>Hébergeur</h2>
      <p>Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.</p>
      <h2>Photos</h2>
      <p>Les crédits photo sont indiqués sur chaque page concernée.</p>
    </LegalPage>
  );
}
