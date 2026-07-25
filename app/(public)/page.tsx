import Link from "next/link";
import { Check, Compass, Layers, MapPin, NotebookPen } from "lucide-react";
import { LandingWhatsAppCTA } from "@/src/components/LandingWhatsAppCTA";
import { PawMark } from "@/src/components/icons/PawMark";

const PILLARS = [
  {
    tag: "Centralisation",
    icon: Layers,
    title: "Personne ne centralise l'essentiel.",
    body: "Fermetures incendie, qualité de l'eau, saturation des parkings : ces infos existent, éparpillées entre préfectures, mairies et applis par site. On les rassemble, chaque jour.",
  },
  {
    tag: "Indépendance",
    icon: Compass,
    title: "Un office de tourisme défend sa commune.",
    body: "Nous, on vous défend vous. Si Cassis sature, on vous envoie ailleurs — un office de tourisme ne peut pas faire ça.",
  },
  {
    tag: "Terrain",
    icon: NotebookPen,
    title: "Des conseils qu'on ne trouve pas en ligne.",
    body: "Nos réponses viennent d'un carnet de terrain vérifié : où se garer vraiment, à quelle heure ça bascule, quoi éviter avec une poussette. Pas de résumés du web.",
  },
];

const STEPS = [
  {
    title: "Écrivez-nous",
    body: "Qui vient, quand, et vos contraintes : enfants, chien, mobilité, mistral.",
  },
  {
    title: "On prépare votre sortie",
    body: "Un plan sur mesure pour le jour dit, avec un plan B si ça ferme ou si ça sature.",
  },
  {
    title: "Vous y allez",
    body: "Dites-nous si c'était juste. Ça corrige le carnet, et ça aide le suivant.",
  },
];

const TRUST_SIGNALS = [
  "Sources officielles liées",
  "Date de vérification affichée partout",
  "Quand on ne sait pas, on le dit",
  "Gratuit, pas de compte, prénom suffit",
];

export default function LandingPage() {
  return (
    <main>
      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-pin">
            <MapPin className="size-3.5" />
            Littoral Marseille — Bandol
          </p>
          <h1 className="mt-6 font-display text-4xl leading-[1.1] tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Le guide local qui vous dit où aller. Et où ne pas aller.
          </h1>
          <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-encre/80">
            Sorties nature entre Marseille et Bandol, conseillées comme le
            ferait un très bon guide du coin : selon la météo, le monde, les
            fermetures du jour — et selon vous. Gratuit, réponse en quelques
            heures.
          </p>
          <div className="mt-10 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <LandingWhatsAppCTA />
            <Link
              href="/places"
              className="flex w-full items-center justify-center rounded-[10px] border border-sable/60 px-6 py-3.5 font-medium text-mediterranee transition-colors duration-150 hover:border-mediterranee hover:bg-calcaire-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee sm:w-auto"
            >
              Voir les lieux couverts
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:pb-24">
        <div className="mx-auto grid max-w-[1040px] grid-cols-1 gap-4 md:grid-cols-3">
          {PILLARS.map(({ tag, icon: Icon, title, body }) => (
            <article
              key={tag}
              className="flex flex-col rounded-[10px] border border-sable/40 bg-white p-6 shadow-sm"
            >
              <Icon className="size-6 text-mediterranee" strokeWidth={1.5} />
              <span className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-pin">
                [ {tag} ]
              </span>
              <h2 className="mt-2 font-display text-xl leading-snug text-balance">
                {title}
              </h2>
              <p className="mt-3 leading-relaxed text-encre/80">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-sable/40 bg-calcaire-deep px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-[760px]">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Comment ça marche
          </h2>
          <ol className="mt-10 flex flex-col gap-8">
            {STEPS.map(({ title, body }, index) => (
              <li key={title} className="flex items-start gap-5">
                <span
                  aria-hidden
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mediterranee font-mono text-base font-medium text-white"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-xl leading-snug">{title}</h3>
                  <p className="mt-1.5 max-w-[55ch] leading-relaxed text-encre/80">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
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
                Développeur et habitant de La Ciotat. Ce site est tenu par une
                seule personne, sur le terrain — pas par une plateforme.
              </p>
            </div>
          </div>
          <ul className="mt-7 grid grid-cols-1 gap-3 border-t border-sable/40 pt-6 sm:grid-cols-2">
            {TRUST_SIGNALS.map((signal) => (
              <li key={signal} className="flex items-start gap-2.5">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-pin"
                  strokeWidth={2.5}
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
            Dites-nous où vous allez. On vous dit quoi éviter.
          </h2>
          <p className="mt-4 max-w-[50ch] leading-relaxed text-encre/80">
            Une question, une date, un plan sur mesure. Réponse en quelques
            heures.
          </p>
          <div className="mt-8 flex w-full justify-center sm:w-auto">
            <LandingWhatsAppCTA />
          </div>
        </div>
      </section>
    </main>
  );
}
