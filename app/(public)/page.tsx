import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { MapPin } from "lucide-react";
import { LandingWhatsAppCTA } from "@/src/components/LandingWhatsAppCTA";
import { SampleExchange } from "@/src/components/SampleExchange";
import { LiveProofLine } from "@/src/components/LiveProofLine";
import { PawMark } from "@/src/components/icons/PawMark";
import {
  getActivePlaces,
  getCoverageCounts,
  getTodayStatusCounts,
} from "@/src/corpus/queries";
import { SITE_URL, SITE_NAME } from "@/src/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "fr-FR",
    },
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      areaServed: "Littoral Marseille–Bandol, ouest Var, Sainte-Baume",
    },
  ],
};

const BENEFITS = [
  {
    tag: "Quand",
    title: "L'heure à viser.",
    body: "Pas « arrivez tôt » : le créneau réel pour ce lieu, ce jour-là. Ex. le parking de Port d'Alon bascule vers 10h30 le dimanche en juillet.",
  },
  {
    tag: "Où",
    title: "Où se garer, vraiment.",
    body: "Là où les locaux se garent, l'entrée à prendre, et ce que le GPS vous fait rater.",
  },
  {
    tag: "Plan B",
    title: "Un plan B avant d'en avoir besoin.",
    body: "Si ça ferme ou si ça sature, vous avez déjà l'alternative — abritée du mistral, ou accessible sans restriction.",
  },
];

const REASONS = [
  {
    title: "Parce que quelqu'un y est allé.",
    body: "Les conseils viennent de visites, de conversations avec des gens du coin, et de retours d'autres sorties — pas d'un résumé de pages web.",
  },
  {
    title: "Parce que l'accès est vérifié chaque soir.",
    body: "Les fermetures incendie changent tous les jours, sont décidées la veille avant 19h, et sont éparpillées entre deux préfectures. On les relève, on les décode, on affiche la date de vérification.",
  },
];

const TRUST_SIGNALS = [
  "Sources officielles liées, date de vérification affichée",
  "Quand on ne sait pas, on le dit",
  "Rien à vendre, aucune commune à promouvoir",
  "Pas de compte, votre prénom suffit",
];

async function TodayProofLine() {
  await connection();
  return <LiveProofLine counts={await getTodayStatusCounts()} />;
}

export default async function LandingPage() {
  const [coverageCounts, places] = await Promise.all([
    getCoverageCounts(),
    getActivePlaces(),
  ]);

  const namedPlaces = places.slice(0, 8);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-pin">
            <MapPin className="size-3.5" />
            Littoral Marseille — Bandol
          </p>
          <h1 className="mt-6 font-display text-4xl leading-[1.1] tracking-tight text-balance sm:text-5xl lg:text-6xl">
            « 40 minutes de route. Parking plein. Massif fermé. »
          </h1>
          <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-encre/80">
            Ça n&apos;arrive plus. Dites-nous qui vient, quand, et vos
            contraintes — on vous répond avec un lieu précis, l&apos;heure à
            viser, où se garer, et un plan B si ça ferme. Gratuit, réponse
            dans la journée.
          </p>
          <div className="mt-10 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <LandingWhatsAppCTA />
            <Link
              href="/lieux"
              className="flex w-full items-center justify-center rounded-[10px] border border-sable/60 px-6 py-3.5 font-medium text-mediterranee transition-colors duration-150 hover:border-mediterranee hover:bg-calcaire-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee sm:w-auto"
            >
              Voir les lieux couverts
            </Link>
          </div>
          <Suspense fallback={null}>
            <TodayProofLine />
          </Suspense>
        </div>
      </section>

      <section className="px-4 pb-20 sm:pb-24">
        <div className="mx-auto max-w-[760px]">
          <SampleExchange />
        </div>
      </section>

      <section className="border-y border-sable/40 bg-calcaire-deep px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-[760px]">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Ce que vous obtenez
          </h2>
          <div className="mt-10 flex flex-col gap-8">
            {BENEFITS.map(({ tag, title, body }) => (
              <div key={tag} className="flex items-start gap-5">
                <span className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-pin">
                  [ {tag} ]
                </span>
                <div>
                  <h3 className="font-display text-xl leading-snug">
                    {title}
                  </h3>
                  <p className="mt-1.5 max-w-[55ch] leading-relaxed text-encre/80">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-[760px]">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Pourquoi c&apos;est plus juste qu&apos;une recherche en ligne
          </h2>
          <div className="mt-10 flex flex-col gap-8">
            {REASONS.map(({ title, body }) => (
              <div key={title}>
                <h3 className="font-display text-xl leading-snug">{title}</h3>
                <p className="mt-1.5 max-w-[60ch] leading-relaxed text-encre/80">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-sable/40 bg-calcaire-deep px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-[760px]">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Couverture
          </h2>
          <p className="mt-4 leading-relaxed text-encre/80">
            {coverageCounts.placeCount > 0
              ? `${coverageCounts.placeCount} ${coverageCounts.placeCount > 1 ? "lieux couverts" : "lieu couvert"} · ${coverageCounts.claimCount} ${coverageCounts.claimCount > 1 ? "infos vérifiées" : "info vérifiée"}.`
              : "On démarre : les premiers lieux arrivent, entre La Ciotat et Bandol."}
          </p>
          {namedPlaces.length > 0 && (
            <p className="mt-4 leading-relaxed text-encre/80">
              {namedPlaces.map((place, index) => (
                <span key={place.id}>
                  <Link
                    href={`/lieux/${place.slug}`}
                    className="text-mediterranee underline decoration-sable/60 underline-offset-4 transition-colors duration-150 hover:decoration-mediterranee"
                  >
                    {place.name}
                  </Link>
                  {index < namedPlaces.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          )}
          <Link
            href="/lieux"
            className="mt-6 inline-block font-medium text-mediterranee underline decoration-sable/60 underline-offset-4 transition-colors duration-150 hover:decoration-mediterranee"
          >
            Voir tous les lieux
          </Link>
        </div>
      </section>

      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-[760px] rounded-[10px] border border-sable/40 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-full border border-sable/40 bg-calcaire">
              <PawMark className="size-8 text-mediterranee" />
            </span>
            <div>
              <h2 className="font-display text-2xl leading-snug">
                Je m&apos;appelle Alexandre.
              </h2>
              <p className="mt-3 max-w-[55ch] leading-relaxed text-encre/80">
                Développeur et habitant de La Ciotat. Je construis un carnet
                du coin, lieu par lieu. Vos questions me disent quoi aller
                vérifier en priorité, et vos retours corrigent le carnet.
                C&apos;est l&apos;échange : vous avez un plan, j&apos;ai une
                raison d&apos;y aller.
              </p>
            </div>
          </div>
          <ul className="mt-7 grid grid-cols-1 gap-3 border-t border-sable/40 pt-6 sm:grid-cols-2">
            {TRUST_SIGNALS.map((signal) => (
              <li key={signal} className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-pin"
                />
                <span className="text-sm leading-relaxed text-encre/80">
                  {signal}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-sable/40 bg-calcaire-deep px-4 py-20 sm:py-24">
        <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
          <h2 className="font-display text-3xl tracking-tight text-balance sm:text-4xl">
            Dites-nous quand vous y allez.
          </h2>
          <p className="mt-4 max-w-[50ch] leading-relaxed text-encre/80">
            Une date, qui vient, vos contraintes. Réponse dans la journée.
          </p>
          <div className="mt-8 flex w-full justify-center sm:w-auto">
            <LandingWhatsAppCTA />
          </div>
        </div>
      </section>
    </main>
  );
}
