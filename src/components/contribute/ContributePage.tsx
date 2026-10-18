import Link from "next/link";
import { Charter } from "@/src/components/contribute/Charter";
import { PlacePicker } from "@/src/components/contribute/PlacePicker";
import { CONTAINER, FOCUS_RING, PROPOSE_PLACE_FORM_HREF } from "@/src/components/landing/shared";
import { getContributors } from "@/src/corpus/community";
import { getActivePlaces } from "@/src/corpus/queries";

const H2 = "font-landing-display text-[28px] leading-[1.15] font-semibold md:text-[36px]";
const CARD = "flex flex-col gap-3 rounded-[14px] border border-[#E4DACA] bg-[#FFFDF8] p-5";
const CARD_LINK = `mt-auto inline-flex h-11 items-center self-start font-semibold text-[#0E4B5A] underline underline-offset-4 ${FOCUS_RING}`;

const REVIEW_STEPS = [
  "Vous envoyez une astuce, une correction, un lieu ou des photos.",
  "Alexandre relit, en général sous quelques jours.",
  "Vous recevez un email quand c’est en ligne, avec votre nom.",
];

const FAQS = [
  {
    q: "Pourquoi ma contribution n’apparaît pas tout de suite ?",
    a: "Alexandre relit chaque contribution avant de la publier, en général sous quelques jours. Vous recevez un email dès qu’elle est en ligne.",
  },
  {
    q: "Mon email est-il affiché ?",
    a: "Non. Seuls votre nom affiché et votre commune sont publics. Votre email ne sert qu’à vous connecter et à vous prévenir.",
  },
  {
    q: "Puis-je utiliser un pseudo ?",
    a: "Oui. Le nom affiché est libre, et vous pouvez le changer à tout moment depuis votre compte.",
  },
  {
    q: "Comment supprimer mon compte ?",
    a: "Depuis la page Mon compte. Vos astuces déjà publiées restent en ligne, créditées « Un ancien contributeur ».",
  },
  {
    q: "Que devient ma contribution si elle n’est pas retenue ?",
    a: "Elle n’est pas publiée. Vous recevez un email, avec la raison quand Alexandre en a donné une.",
  },
];

export async function ContributePage() {
  const [places, contributors] = await Promise.all([getActivePlaces(), getContributors()]);
  const activeIds = new Set(places.map((p) => p.id));
  const topLevel = places.filter((p) => !p.parentId || !activeIds.has(p.parentId));

  return (
    <>
      <section className={`${CONTAINER} pt-6 pb-10 md:pt-16 md:pb-16`}>
        <div className="flex max-w-[760px] flex-col gap-4 md:gap-5.5">
          <h1 className="font-landing-display text-[34px] leading-[1.1] font-semibold tracking-[-0.01em] md:text-[56px] md:leading-[1.08]">
            Le guide s’écrit à plusieurs
          </h1>
          <p className="text-[17px] leading-[1.55] text-[#3E4A4B] md:text-[19px]">
            Chaque conseil vient de quelqu’un qui connaît le lieu. Ajoutez le vôtre : Alexandre
            relit tout avant publication.
          </p>
        </div>
      </section>

      <section aria-labelledby="facons-titre" className={`${CONTAINER} pb-12 md:pb-20`}>
        <h2 id="facons-titre" className={H2}>
          Quatre façons d’aider
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <li className={CARD}>
            <h3 className="text-[18px] font-semibold">Partager une astuce</h3>
            <p className="text-[#3E4A4B]">L’heure à viser, où se garer, ce qu’on emporte.</p>
            <Link href="#astuce" className={CARD_LINK}>
              Choisir un lieu
            </Link>
          </li>
          <li className={CARD}>
            <h3 className="text-[18px] font-semibold">Corriger une info</h3>
            <p className="text-[#3E4A4B]">
              Sur chaque fiche, cliquez Corriger sous le conseil concerné.
            </p>
          </li>
          <li className={CARD}>
            <h3 className="text-[18px] font-semibold">Ajouter des photos</h3>
            <p className="text-[#3E4A4B]">Vos propres photos, pour montrer le lieu tel qu’il est.</p>
            <Link href="#astuce" className={CARD_LINK}>
              Choisir un lieu
            </Link>
          </li>
          <li className={CARD}>
            <h3 className="text-[18px] font-semibold">Proposer un lieu</h3>
            <p className="text-[#3E4A4B]">Un coin qui manque au guide ? Dites-nous où il est.</p>
            <Link
              href={PROPOSE_PLACE_FORM_HREF}
              className={`mt-auto inline-flex h-11 items-center justify-center self-start rounded-full bg-[#0E4B5A] px-5 font-semibold text-white hover:bg-[#0A3843] ${FOCUS_RING}`}
            >
              Proposer un lieu
            </Link>
          </li>
        </ul>
      </section>

      <div className="bg-[#EAE2D3] py-12 md:py-20">
        <div className={CONTAINER}>
          <PlacePicker places={topLevel} />
        </div>
      </div>

      <section aria-labelledby="relu-titre" className={`${CONTAINER} py-12 md:py-20`}>
        <h2 id="relu-titre" className={H2}>
          Comment c’est relu
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {REVIEW_STEPS.map((step, i) => (
            <li key={step} className={`${CARD} flex-row items-start gap-4`}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0E4B5A] font-semibold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-[760px] text-[#3E4A4B]">
          Publics : votre nom affiché et votre commune. Privé : votre email, qui n’est jamais
          affiché.
        </p>
      </section>

      <div className="bg-[#EAE2D3] py-12 md:py-20">
        <div className={CONTAINER}>
          <Charter expanded />
        </div>
      </div>

      {contributors.length >= 3 && (
        <section aria-labelledby="merci-titre" className={`${CONTAINER} py-12 md:py-20`}>
          <h2 id="merci-titre" className={H2}>
            Merci à
          </h2>
          <ul className="mt-6 flex flex-wrap gap-x-3 gap-y-2 text-[17px]">
            {contributors.map((c, i) => (
              <li key={`${c.name}-${c.commune ?? ""}-${i}`} className="wrap-break-word">
                {c.commune ? `${c.name} · ${c.commune}` : c.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        aria-labelledby="faq-titre"
        className={`${CONTAINER} pt-12 pb-16 md:pt-20 md:pb-24`}
      >
        <h2 id="faq-titre" className={H2}>
          Questions de contributeurs
        </h2>
        <div className="mt-6 flex max-w-[760px] flex-col divide-y divide-[#E4DACA] border-y border-[#E4DACA]">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group py-4">
              <summary
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-4 font-semibold ${FOCUS_RING}`}
              >
                {faq.q}
                <span aria-hidden className="shrink-0 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-[#3E4A4B]">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
