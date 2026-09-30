"use client";

import Link from "next/link";
import { Suspense, use, useRef, useState, useTransition, type FormEvent } from "react";
import { searchPlaces } from "@/app/(landing)/actions";
import type { SearchResult, SearchResultPlace, ShortcutSuggestions } from "@/src/search/types";
import { PhotoImage } from "../PhotoImage";
import { ArrowIcon, BulbIcon, SearchIcon } from "./icons";
import { GUIDE_HREF } from "./shared";

const BADGE_GRID = "grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-nowrap md:justify-center md:gap-2.5";
const BADGE_SHAPE =
  "flex min-h-15 items-center justify-center gap-2.5 rounded-2xl border-3 px-3.5 py-2 text-[14px] leading-[1.25] md:min-h-auto md:h-12.5 md:justify-start md:rounded-full md:px-5 md:text-[15px]";
const MOMENT_LABEL = "pt-1 text-[13px] text-[#BFD8D6] md:text-[14px]";

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

function ShortcutPlaceholders() {
  return (
    <>
      <span className={MOMENT_LABEL}>&nbsp;</span>
      <div aria-hidden className={BADGE_GRID}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${BADGE_SHAPE} w-full border-white/10 bg-white/10 md:w-44`} />
        ))}
      </div>
    </>
  );
}

function ShortcutBadges({
  suggestions,
  selected,
  onToggle,
}: {
  suggestions: Promise<ShortcutSuggestions>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const { label, shortcuts } = use(suggestions);

  return (
    <>
      <span className={MOMENT_LABEL}>{label}</span>
      <div className={BADGE_GRID}>
        {shortcuts.map((shortcut) => {
          const active = selected.includes(shortcut.id);
          return (
            <button
              key={shortcut.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(shortcut.id)}
              style={{
                borderColor: shortcut.bgColor,
                background: active ? "#FFFFFF" : shortcut.bgColor,
                color: shortcut.fgColor,
              }}
              className={`${BADGE_SHAPE} ${active ? "font-bold" : "font-semibold"}`}
            >
              {shortcut.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

function ResultCard({ place }: { place: SearchResultPlace }) {
  return (
    <article className="flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-[#E4DACA] bg-[#FFFDF8] md:rounded-[20px]">
      <div className="flex items-center gap-3 p-3.5 md:block md:p-0">
        <div className="relative size-18 shrink-0 overflow-hidden rounded-xl bg-[#D9E4E2] md:h-[150px] md:w-full md:rounded-none">
          {place.cover && <PhotoImage photo={place.cover} sizes="(min-width: 768px) 380px, 72px" />}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 md:hidden">
          <h3 className="font-landing-display text-[19px] leading-[1.2] font-semibold">{place.name}</h3>
          <span className="text-[13px] text-[#5B6663]">{place.commune}</span>
        </div>
      </div>
      <div className="flex grow flex-col gap-2.5 px-3.5 pb-3.5 md:gap-2.5 md:px-5 md:pt-1 md:pb-5">
        <div className="hidden flex-col gap-0.5 md:flex">
          <h3 className="font-landing-display text-[21px] leading-[1.2] font-semibold">{place.name}</h3>
          <span className="text-[13px] text-[#5B6663]">{place.commune}</span>
        </div>
        {place.excerpt && (
          <p className="text-[15px] leading-[1.45] font-semibold text-[#2E3A3C]">{place.excerpt}</p>
        )}
        {place.tips.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {place.tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-[14px] leading-[1.45] text-[#3E4A4B]">
                <BulbIcon className="mt-0.5 size-3.75 shrink-0 text-[#A34A25]" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={`/lieux/${place.slug}`}
          className="mt-auto flex h-9 items-center gap-1.5 pt-1.5 text-[15px] font-semibold text-[#0E4B5A] no-underline md:h-auto"
        >
          Voir la fiche
          <ArrowIcon className="size-4" />
        </Link>
      </div>
    </article>
  );
}

function Results({ result, pending, onClear }: { result: SearchResult; pending: boolean; onClear: () => void }) {
  return (
    <section
      aria-live="polite"
      aria-busy={pending}
      className={`mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-10 transition-opacity md:gap-6 md:px-8 md:pb-24 ${
        pending ? "opacity-60" : ""
      }`}
    >
      {result.status === "error" ? (
        <div className="flex flex-col gap-2.5 border-t border-[#E4DACA] pt-7 md:pt-10">
          <p className="text-[17px] leading-[1.5] text-[#1D2A2E] md:text-[19px]">
            La recherche est indisponible pour le moment.{" "}
            <Link href={GUIDE_HREF} className="font-semibold text-[#0E4B5A]">
              Voir tous les lieux du guide
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5 border-t border-[#E4DACA] pt-7 md:pt-10">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-landing-display text-[24px] font-semibold md:text-[32px]">{result.title}</h2>
              <button
                type="button"
                onClick={onClear}
                className="shrink-0 border-0 bg-transparent text-[14px] font-semibold text-[#4A5557] underline md:text-[15px]"
              >
                Effacer
              </button>
            </div>
            <span className="text-[13px] leading-[1.4] text-[#6A7472]">Conseils d’Alexandre et des gens d’ici</span>
            <p className="mt-1 max-w-[820px] text-[17px] leading-[1.5] text-[#1D2A2E] md:text-[19px]">
              {result.intro}
            </p>
          </div>

          {result.status === "ok" && (
            <div className="flex flex-col gap-4 md:gap-5">
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3 md:gap-5">
                {result.places.map((place) => (
                  <ResultCard key={place.slug} place={place} />
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

          {result.status === "empty" && (
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
        </>
      )}
    </section>
  );
}

export function SearchHero({ shortcuts }: { shortcuts: Promise<ShortcutSuggestions> }) {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [pending, startTransition] = useTransition();
  // Only the latest search may update the results (older, slower ones are dropped).
  const latestRequest = useRef(0);

  function runSearch(nextText: string, nextSelected: string[]) {
    const requestId = ++latestRequest.current;
    if (!nextText.trim() && nextSelected.length === 0) {
      setResult(null);
      return;
    }
    startTransition(async () => {
      let next: SearchResult;
      try {
        next = await searchPlaces({ text: nextText, shortcutIds: nextSelected });
      } catch {
        next = { status: "error" };
      }
      if (requestId !== latestRequest.current) return;
      startTransition(() => setResult(next));
    });
  }

  function toggleShortcut(id: string) {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    setSelected(next);
    runSearch(text, next);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch(text, selected);
  }

  function clear() {
    latestRequest.current++;
    setText("");
    setSelected([]);
    setResult(null);
  }

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

          <form onSubmit={submit} className="relative mt-3.5 flex w-full max-w-[760px] items-center">
            <label htmlFor="q" className="sr-only">
              Décrivez votre sortie
            </label>
            <input
              id="q"
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={300}
              placeholder="Ex. : samedi matin, avec deux enfants et sans voiture"
              className="h-14.5 w-full rounded-full border-0 bg-white pr-19 pl-5 text-[16px] text-[#1D2A2E] shadow-[0_10px_30px_rgba(4,26,32,0.35)] md:h-17 md:pr-19 md:pl-7 md:text-[18px] md:shadow-[0_12px_36px_rgba(4,26,32,0.35)]"
            />
            <button
              type="submit"
              aria-label="Chercher"
              disabled={pending}
              className="absolute right-1.5 flex size-11.5 items-center justify-center rounded-full border-0 bg-[#A34A25] text-white disabled:opacity-60 md:right-2 md:size-13"
            >
              <SearchIcon className="size-5 md:size-5.5" />
            </button>
          </form>

          <Suspense fallback={<ShortcutPlaceholders />}>
            <ShortcutBadges suggestions={shortcuts} selected={selected} onToggle={toggleShortcut} />
          </Suspense>
        </section>
      </div>
      <WaveDivider />

      {result && <Results result={result} pending={pending} onClear={clear} />}
    </>
  );
}
