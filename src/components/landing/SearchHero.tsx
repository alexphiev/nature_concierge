"use client";

import { useState } from "react";
import { ArrowIcon, BulbIcon, SearchIcon } from "./icons";

type BadgeId = "kids" | "first" | "sunset" | "dog";

type Tip = { text: string };
type Result = { name: string; town: string; why: string; tips: Tip[] };
type Answer = { q: string; intro: string; results: Result[]; empty?: boolean };

const BADGES: { id: BadgeId; label: string; bg: string; fg: string }[] = [
  { id: "kids", label: "Avec de jeunes enfants", bg: "#F6D98B", fg: "#4A3A0A" },
  { id: "first", label: "Première fois à La Ciotat", bg: "#A9DCD3", fg: "#0B3A44" },
  { id: "sunset", label: "Coucher de soleil", bg: "#F6B39A", fg: "#5A1E10" },
  { id: "dog", label: "Avec un chien", bg: "#C9E0A8", fg: "#2A4318" },
];

const ANSWERS: Record<BadgeId, Answer> = {
  first: {
    q: "Première fois à La Ciotat",
    intro:
      "Trois lieux pour comprendre le coin en une journée : la roche rouge, la mer et la vue sur le Bec de l’Aigle.",
    results: [
      {
        name: "Calanque de Figuerolles",
        town: "La Ciotat",
        why: "Les falaises de poudingue rouge, typiques de La Ciotat.",
        tips: [{ text: "[Tip : accès à pied depuis le centre]" }, { text: "[Tip : meilleur moment de la journée]" }],
      },
      {
        name: "Parc du Mugel",
        town: "La Ciotat",
        why: "Un jardin au pied du Bec de l’Aigle, la calanque à côté.",
        tips: [{ text: "[Tip : où se garer]" }, { text: "[Tip : horaires du parc]" }],
      },
      {
        name: "Île Verte",
        town: "Au large de La Ciotat",
        why: "La seule île boisée du coin, à quelques minutes de bateau.",
        tips: [
          { text: "Vérifiez que la navette tourne encore : le service change après l’été." },
          { text: "[Tip : quoi emporter]" },
        ],
      },
    ],
  },
  kids: {
    q: "Avec de jeunes enfants",
    intro:
      "Ce dimanche, avec du mistral : visez court, abrité et avec de l’ombre. Évitez Port d’Alon, qui prend le vent de face.",
    results: [
      {
        name: "La Madrague",
        town: "Saint-Cyr-sur-Mer",
        why: "Abritée du mistral, sentier court, faisable avec un 3 ans.",
        tips: [{ text: "Visez avant 10h le week-end." }, { text: "[Tip : où se garer]" }],
      },
      {
        name: "Parc du Mugel",
        town: "La Ciotat",
        why: "Allées ombragées, place pour courir, calanque juste à côté.",
        tips: [{ text: "[Tip : poussette possible ?]" }, { text: "[Tip : toilettes, point d’eau]" }],
      },
      {
        name: "Calanque du Mugel",
        town: "La Ciotat",
        why: "Petite crique à deux pas du parc pour finir par une baignade.",
        tips: [{ text: "[Tip : entrée dans l’eau, chaussures]" }, { text: "[Tip : heure où ça se vide]" }],
      },
    ],
  },
  dog: {
    q: "Avec un chien",
    empty: true,
    intro: "Je n’ai pas encore de conseil fiable sur les lieux où les chiens sont acceptés.",
    results: [],
  },
  sunset: {
    q: "Coucher de soleil",
    intro: "Coucher du soleil vers 19h20. Un seul spot, mais le bon.",
    results: [
      {
        name: "Route des Crêtes",
        town: "Entre La Ciotat et Cassis",
        why: "Vue sur les falaises et la baie depuis les hauteurs.",
        tips: [
          { text: "Fermée par grand vent ou risque incendie : vérifiez avant de monter." },
          { text: "[Tip : meilleur belvédère, où se garer]" },
        ],
      },
    ],
  },
};

function WaveDivider() {
  return (
    <div aria-hidden className="h-14 leading-none md:h-24">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="block"
      >
        <path
          d="M0 60 C 240 30, 480 90, 720 62 C 960 34, 1200 84, 1440 56 L1440 120 L0 120 Z"
          fill="#1F6474"
        />
        <path
          d="M0 78 C 160 50, 330 42, 520 70 C 680 94, 820 52, 1000 44 C 1170 38, 1310 74, 1440 64 L1440 120 L0 120 Z"
          fill="#C2653A"
        />
        <path
          d="M0 100 C 260 84, 500 114, 760 100 C 1010 86, 1240 112, 1440 98 L1440 120 L0 120 Z"
          fill="#F5EFE4"
        />
      </svg>
    </div>
  );
}

function ResultCard({ result }: { result: Result }) {
  return (
    <article className="flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-[#E4DACA] bg-[#FFFDF8] md:rounded-[20px]">
      <div className="flex items-center gap-3 p-3.5 md:block md:p-0">
        <div className="flex size-18 shrink-0 items-center justify-center rounded-xl bg-[#D9E4E2] text-[11px] font-semibold text-[#34494C] md:size-auto md:h-[150px] md:items-end md:justify-start md:rounded-none md:p-2.5">
          <span className="hidden rounded-xl bg-[#FFFDF8] px-2.5 py-1 md:block">Photo</span>
          <span className="md:hidden">Photo</span>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 md:hidden">
          <h3 className="font-landing-display text-[19px] leading-[1.2] font-semibold">{result.name}</h3>
          <span className="text-[13px] text-[#5B6663]">{result.town}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 px-3.5 pb-3.5 md:gap-2.5 md:px-5 md:pt-1 md:pb-5">
        <div className="hidden flex-col gap-0.5 md:flex">
          <h3 className="font-landing-display text-[21px] leading-[1.2] font-semibold">{result.name}</h3>
          <span className="text-[13px] text-[#5B6663]">{result.town}</span>
        </div>
        <p className="text-[15px] leading-[1.45] font-semibold text-[#2E3A3C]">{result.why}</p>
        <ul className="flex flex-col gap-1.5">
          {result.tips.map((tip) => (
            <li key={tip.text} className="flex items-start gap-2 text-[14px] leading-[1.45] text-[#3E4A4B]">
              <BulbIcon className="mt-0.5 size-3.75 shrink-0 text-[#A34A25]" />
              <span>{tip.text}</span>
            </li>
          ))}
        </ul>
        <a
          href="#"
          className="mt-auto flex h-9 items-center gap-1.5 pt-1.5 text-[15px] font-semibold text-[#0E4B5A] no-underline md:h-auto"
        >
          Voir la fiche
          <ArrowIcon className="size-4" />
        </a>
      </div>
    </article>
  );
}

export function SearchHero() {
  const [selected, setSelected] = useState<BadgeId | null>(null);
  const answer = selected ? ANSWERS[selected] : null;

  return (
    <>
      <div style={{ background: "#0E4B5A" }} className="text-white">
        <section className="mx-auto flex max-w-[800px] flex-col items-center gap-4 px-4 pt-10 pb-7 md:gap-5 md:px-0 md:pt-24 md:pb-14">
          <h1 className="text-center font-landing-display text-[36px] leading-[1.08] font-semibold tracking-[-0.015em] md:text-[64px] md:leading-[1.06]">
            Où aller en nature autour de La Ciotat ?
          </h1>
          <p className="max-w-[640px] text-center text-[17px] leading-[1.5] text-[#CFE3E1] md:text-[20px]">
            Décrivez votre sortie, je vous dis où aller. Avec les conseils vérifiés des gens d’ici.
          </p>

          <form className="relative mt-3.5 flex w-full max-w-[760px] items-center">
            <label htmlFor="q" className="sr-only">
              Décrivez votre sortie
            </label>
            <input
              id="q"
              type="text"
              placeholder="Ex. : samedi matin, avec deux enfants et sans voiture"
              className="h-14.5 w-full rounded-full border-0 bg-white pr-19 pl-5 text-[16px] text-[#1D2A2E] shadow-[0_10px_30px_rgba(4,26,32,0.35)] md:h-17 md:pr-19 md:pl-7 md:text-[18px] md:shadow-[0_12px_36px_rgba(4,26,32,0.35)]"
            />
            <button
              type="button"
              aria-label="Chercher"
              className="absolute right-1.5 flex size-11.5 items-center justify-center rounded-full border-0 bg-[#A34A25] text-white md:right-2 md:size-13"
            >
              <SearchIcon className="size-5 md:size-5.5" />
            </button>
          </form>

          <span className="pt-1 text-[13px] text-[#BFD8D6] md:text-[14px]">
            Idées pour ce dimanche après-midi
          </span>
          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-nowrap md:justify-center md:gap-2.5">
            {BADGES.map((badge) => {
              const active = badge.id === selected;
              return (
                <button
                  key={badge.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(active ? null : badge.id)}
                  style={{
                    borderColor: badge.bg,
                    background: active ? "#FFFFFF" : badge.bg,
                    color: badge.fg,
                  }}
                  className={`flex min-h-15 items-center justify-center gap-2.5 rounded-2xl border-3 px-3.5 py-2 text-[14px] leading-[1.25] md:min-h-auto md:h-12.5 md:justify-start md:rounded-full md:px-5 md:text-[15px] ${
                    active ? "font-bold" : "font-semibold"
                  }`}
                >
                  {badge.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>
      <WaveDivider />

      {answer && (
        <section aria-live="polite" className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-10 md:gap-6 md:px-8 md:pb-24">
          <div className="flex flex-col gap-2.5 border-t border-[#E4DACA] pt-7 md:pt-10">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-landing-display text-[24px] font-semibold md:text-[32px]">{answer.q}</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="shrink-0 border-0 bg-transparent text-[14px] font-semibold text-[#4A5557] underline md:text-[15px]"
              >
                Effacer
              </button>
            </div>
            <span className="text-[13px] leading-[1.4] text-[#6A7472]">
              Conseils d’Alexandre et des gens d’ici · adaptés à aujourd’hui : mistral modéré, massifs ouverts
            </span>
            <p className="mt-1 max-w-[820px] text-[17px] leading-[1.5] text-[#1D2A2E] md:text-[19px]">
              {answer.intro}
            </p>
          </div>

          {!answer.empty && (
            <div className="flex flex-col gap-4 md:gap-5">
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3 md:gap-5">
                {answer.results.map((result) => (
                  <ResultCard key={result.name} result={result} />
                ))}
              </div>
              <p className="text-[14px] text-[#4A5557] md:text-[15px]">
                Pas tout à fait ça ?{" "}
                <a href="#" className="font-semibold text-[#0E4B5A]">
                  Précisez votre demande
                </a>{" "}
                ou{" "}
                <a href="#" className="font-semibold text-[#0E4B5A]">
                  dites-moi ce qui manque
                </a>
                .
              </p>
            </div>
          )}

          {answer.empty && (
            <div className="flex flex-col gap-3.5 rounded-[20px] border border-[#E4DACA] bg-[#FFFDF8] p-5 md:w-[760px] md:p-7">
              <p className="text-[15px] leading-[1.5] text-[#3E4A4B] md:text-[16px]">
                Je suis prévenu et j’irai vérifier. Laissez votre email si vous voulez la réponse.
              </p>
              <form className="flex flex-col gap-2.5 md:flex-row">
                <label htmlFor="mail" className="sr-only">
                  Votre email
                </label>
                <input
                  id="mail"
                  type="email"
                  placeholder="votre@email.fr (facultatif)"
                  className="h-12.5 grow rounded-full border border-[#D5CAB6] bg-white px-4.5 text-[16px]"
                />
                <button
                  type="button"
                  className="h-12.5 rounded-full border-0 bg-[#0E4B5A] px-5.5 text-[16px] font-semibold text-white"
                >
                  Me prévenir
                </button>
              </form>
            </div>
          )}
        </section>
      )}
    </>
  );
}
