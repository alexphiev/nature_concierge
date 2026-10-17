import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/src/components/site/LegalPage";
import { BASE_OPEN_GRAPH, CONTACT_EMAIL } from "@/src/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Les données que nous collectons, pourquoi, et comment les supprimer.",
  alternates: { canonical: "/confidentialite" },
  openGraph: { ...BASE_OPEN_GRAPH, url: "/confidentialite" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <h2>Données collectées</h2>
      <ul>
        <li>Votre adresse email.</li>
        <li>Votre nom affiché et, si vous le souhaitez, votre commune.</li>
        <li>Vos contributions : astuces, corrections, propositions de lieux et photos.</li>
      </ul>
      <p>Votre email n’est jamais affiché publiquement.</p>
      <h2>Pourquoi</h2>
      <ul>
        <li>Vous connecter par lien envoyé par email, sans mot de passe.</li>
        <li>Vous créditer sur les contributions publiées.</li>
        <li>Vous prévenir par email de la décision sur vos contributions.</li>
      </ul>
      <h2>Prestataires</h2>
      <ul>
        <li>Neon : base de données.</li>
        <li>Resend : envoi des emails.</li>
        <li>Vercel : hébergement et mesure d’audience sans cookie.</li>
      </ul>
      <h2>Durée de conservation</h2>
      <p>
        Vos données sont conservées jusqu’à la suppression de votre compte. Les contributions
        non confirmées par le lien reçu par email sont supprimées au bout de 7 jours.
      </p>
      <h2>Vos droits</h2>
      <p>
        Vous pouvez accéder à vos données, les corriger ou les supprimer depuis{" "}
        <Link href="/compte">votre compte</Link>, ou en écrivant à{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
