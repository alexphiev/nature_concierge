import Link from "next/link";
import { ArrowIcon, ChatIcon, CoffeeIcon, PinIcon, PlusIcon } from "./icons";
import { ASK_HREF, CONTAINER, FOCUS_RING, GUIDE_HREF, PROPOSE_PLACE_HREF, SHARE_TIP_HREF } from "./shared";

const TIPEEE_HREF = "#";
const ACCESS_MAP_HREF_LOCAL = "#";

const COMMITMENTS = [
  "Gratuit, sans publicité, sans compte à créer.",
  "Aucun lieu ne paie pour apparaître.",
  "Chaque fiche affiche sa date de mise à jour.",
  "Quand je ne sais pas, je le dis.",
  "Pour les fermetures de massifs, je renvoie toujours vers la source officielle.",
];

const FAQS = [
  {
    q: "Le guide est-il vraiment gratuit ?",
    a: (
      <>
        Oui, les fiches comme les réponses sur WhatsApp. Ceux qui le souhaitent peuvent{" "}
        <a href="#soutenir" className="font-semibold">
          soutenir le projet sur Tipeee
        </a>
        .
      </>
    ),
  },
  {
    q: "Quels lieux couvre le guide ?",
    a: "Les calanques, criques et espaces naturels de La Ciotat et des environs : le Mugel, Figuerolles, l’Anse du Sec, l’Île Verte, jusqu’à Port d’Alon à Saint-Cyr-sur-Mer. La liste s’agrandit au fil des sorties.",
  },
  {
    q: "Comment savoir si les massifs sont ouverts en été ?",
    a: (
      <>
        L’accès dépend du risque incendie. La préfecture publie la carte chaque veille au soir. Je
        la signale dans mes réponses, mais c’est elle qui fait foi :{" "}
        <a href={ACCESS_MAP_HREF_LOCAL} className="font-semibold">
          carte des accès
        </a>
        .
      </>
    ),
  },
  {
    q: "En combien de temps répondez-vous ?",
    a: "En général dans la journée. Un peu plus si je suis moi-même en balade, sans réseau.",
  },
  {
    q: "Comment proposer un lieu ou corriger une info ?",
    a: "Envoyez-moi un message sur WhatsApp avec le nom du lieu et votre astuce. Je vais voir sur place, puis je mets la fiche à jour.",
  },
  {
    q: "Êtes-vous guide professionnel ?",
    a: "Non. Je suis un habitant qui partage ce qu’il a appris. Pour une randonnée encadrée, adressez-vous à un accompagnateur diplômé.",
  },
];

export function AboutContent() {
  return (
    <>
      <section className={`${CONTAINER} grid gap-8 pt-6 pb-10 md:gap-20 md:pt-16 md:pb-24 lg:grid-cols-[7fr_5fr] lg:items-start`}>
        <div className="flex flex-col gap-4 md:gap-5.5">
          <nav aria-label="Fil d’Ariane" className="flex gap-1.5 text-[13px] text-[#5B6663] md:text-[14px]">
            <Link href="/" className={FOCUS_RING}>
              Accueil
            </Link>
            <span>/</span>
            <span>À propos</span>
          </nav>
          <h1 className="font-landing-display text-[34px] leading-[1.1] font-semibold tracking-[-0.01em] md:text-[56px] md:leading-[1.08]">
            À propos du Guide Nature de La Ciotat
          </h1>
          <p className="text-[17px] leading-[1.5] text-[#3E4A4B] md:text-[21px] md:leading-[1.5]">
            Un guide gratuit des calanques, criques et sentiers de La Ciotat et de ses environs,
            écrit par un habitant, avec l’aide des gens d’ici.
          </p>
          <figure className="mt-2 flex flex-col gap-2 lg:hidden">
            <div className="flex h-[300px] items-center justify-center rounded-[20px] bg-[#D8CDBA] text-[13px] font-semibold text-[#5B6663]">
              Photo · portrait d’Alexandre
            </div>
            <figcaption className="text-[13px] text-[#5B6663]">
              Alexandre, [lieu de la photo].
            </figcaption>
          </figure>
          <h2 className="mt-2 font-landing-display text-[26px] font-semibold md:mt-6 md:text-[30px]">
            Qui tient ce guide ?
          </h2>
          <div className="flex max-w-[640px] flex-col gap-3.5 text-[17px] leading-[1.6] text-[#2E3A3C] md:gap-4 md:text-[18px] md:leading-[1.65]">
            <p>Je m’appelle Alexandre et j’habite La Ciotat depuis 2025.</p>
            <p>
              En arrivant, j’ai passé mes week-ends à chercher où aller : quelle calanque éviter
              le dimanche, laquelle reste à l’abri du mistral, où se garer sans tourner une heure.
              Les bonnes réponses ne se trouvaient pas en ligne. Elles venaient des voisins et des
              habitués.
            </p>
            <p>J’ai tout noté. Ce guide, c’est ce carnet, partagé avec vous.</p>
          </div>
        </div>
        <figure className="hidden flex-col gap-3 lg:flex">
          <div className="flex h-[520px] items-center justify-center rounded-3xl bg-[#D8CDBA] text-[14px] font-semibold text-[#5B6663]">
            Photo · portrait d’Alexandre en extérieur
          </div>
          <figcaption className="text-[14px] text-[#5B6663]">
            Alexandre, [lieu de la photo].
          </figcaption>
        </figure>
      </section>

      <section className={`${CONTAINER} flex flex-col gap-4 pb-10 md:gap-8 md:pb-24`}>
        <h2 className="font-landing-display text-[28px] font-semibold md:text-[40px]">
          Ce que propose le guide
        </h2>
        <div className="grid gap-3.5 md:grid-cols-3 md:gap-6">
          <div className="flex gap-3.5 rounded-2xl border border-[#E4DACA] bg-[#FFFDF8] p-5 md:flex-col md:gap-3.5 md:p-8">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E3EDEB] text-[#0E4B5A] md:size-12">
              <PinIcon className="size-5 md:size-5.5" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-landing-display text-[19px] font-semibold md:text-[22px]">
                Des fiches lieux utiles
              </h3>
              <p className="text-[15px] leading-[1.5] text-[#3E4A4B] md:text-[16px] md:leading-[1.55]">
                Accès, parking, meilleurs horaires, exposition au mistral. Ce qu’on aimerait
                savoir avant de partir.
              </p>
            </div>
          </div>
          <div className="flex gap-3.5 rounded-2xl border border-[#E4DACA] bg-[#FFFDF8] p-5 md:flex-col md:gap-3.5 md:p-8">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E3EDEB] text-[#0E4B5A] md:size-12">
              <ChatIcon className="size-5 md:size-5.5" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-landing-display text-[19px] font-semibold md:text-[22px]">
                Des conseils sur WhatsApp
              </h3>
              <p className="text-[15px] leading-[1.5] text-[#3E4A4B] md:text-[16px] md:leading-[1.55]">
                Dites-moi qui vient, quand, et vos contraintes. Je vous réponds avec un lieu
                adapté et un plan B, gratuitement.
              </p>
            </div>
          </div>
          <div className="flex gap-3.5 rounded-2xl border border-[#E4DACA] bg-[#FFFDF8] p-5 md:flex-col md:gap-3.5 md:p-8">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E3EDEB] text-[#0E4B5A] md:size-12">
              <PlusIcon className="size-5 md:size-5.5" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-landing-display text-[19px] font-semibold md:text-[22px]">
                Un guide qui grandit
              </h3>
              <p className="text-[15px] leading-[1.5] text-[#3E4A4B] md:text-[16px] md:leading-[1.55]">
                Vos lieux et vos astuces enrichissent le guide. Je vais vérifier sur place avant
                de les ajouter.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${CONTAINER} flex flex-col gap-6 pb-10 md:grid md:grid-cols-2 md:items-stretch md:gap-6 md:pb-24`}>
        <div className="flex flex-col gap-4 md:gap-6 md:pr-6">
          <h2 className="font-landing-display text-[28px] font-semibold md:text-[40px]">
            Mes engagements
          </h2>
          <ul className="flex flex-col gap-3 text-[16px] leading-[1.5] md:gap-4 md:text-[18px]">
            {COMMITMENTS.map((item) => (
              <li key={item} className="flex items-start gap-3 md:gap-3.5">
                <svg
                  aria-hidden
                  focusable="false"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0E4B5A"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 size-5 shrink-0 md:size-5.5"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div
          id="soutenir"
          className="flex flex-col gap-3.5 rounded-3xl bg-[#FBE9DD] p-6 md:gap-4.5 md:rounded-[28px] md:p-11"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-[#A34A25] text-white md:size-13">
            <CoffeeIcon className="size-5.5 md:size-6" />
          </div>
          <h2 className="font-landing-display text-[28px] font-semibold md:text-[36px]">
            Soutenir le guide
          </h2>
          <p className="text-[16px] leading-[1.55] text-[#4A3A31] md:text-[17px] md:leading-[1.6]">
            Le guide restera gratuit. Ce qu’il coûte, c’est du temps : aller voir les lieux,
            vérifier les accès, répondre aux messages.
          </p>
          <p className="text-[16px] leading-[1.55] text-[#4A3A31] md:text-[17px] md:leading-[1.6]">
            Si un conseil vous a fait passer une belle journée, vous pouvez me soutenir sur
            Tipeee, une fois ou chaque mois, du montant que vous voulez.
          </p>
          <div className="flex flex-col gap-2 pt-1 md:flex-row md:items-center md:gap-4 md:pt-1.5">
            <a
              href={TIPEEE_HREF}
              className={`flex h-13 items-center justify-center gap-2.5 rounded-full bg-[#A34A25] text-[17px] font-semibold text-white md:h-13.5 md:justify-start md:px-6.5 ${FOCUS_RING}`}
            >
              <CoffeeIcon className="size-[19px]" />
              Soutenir sur Tipeee
            </a>
            <span className="text-center text-[13px] text-[#6B5447] md:text-left md:text-[14px]">
              Sans obligation : la réponse est la même pour tous.
            </span>
          </div>
          <div className="mt-1 border-t border-[#EBCDB8] pt-4 text-[14px] leading-[1.6] text-[#4A3A31] md:pt-4.5 md:text-[15px]">
            Autres façons d’aider :{" "}
            <a href={PROPOSE_PLACE_HREF} className="font-semibold text-[#A34A25]">
              proposer un lieu
            </a>
            ,{" "}
            <a href={SHARE_TIP_HREF} className="font-semibold text-[#A34A25]">
              partager une astuce
            </a>
            , ou parler du guide autour de vous.
          </div>
        </div>
      </section>

      <section className={`${CONTAINER} flex flex-col gap-5 pb-10 md:gap-8 md:pb-24`}>
        <h2 className="font-landing-display text-[28px] font-semibold md:text-[40px]">
          Questions fréquentes
        </h2>
        <div className="md:grid md:grid-cols-2 md:gap-x-16">
          {FAQS.map((faq, i) => (
            <div
              key={faq.q}
              className={`flex flex-col gap-1.5 border-t border-[#DDD2BF] py-4.5 md:gap-2 md:py-6 ${i === FAQS.length - 1 || i === FAQS.length - 2 ? "border-b" : ""}`}
            >
              <h3 className="text-[17px] font-bold md:text-[19px]">{faq.q}</h3>
              <p className="text-[15px] leading-[1.55] text-[#3E4A4B] md:text-[16px] md:leading-[1.6]">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${CONTAINER} pb-10 md:pb-24`}>
        <div className="flex flex-col gap-4 rounded-3xl bg-[#0E4B5A] p-6 text-white md:flex-row md:items-center md:justify-between md:gap-12 md:rounded-[28px] md:p-14">
          <div className="flex flex-col gap-2">
            <h2 className="font-landing-display text-[28px] font-semibold md:text-[40px]">
              Une sortie en tête ?
            </h2>
            <p className="text-[16px] text-[#D6E6E8] md:text-[18px]">
              Écrivez-moi, je vous aide à l’organiser.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 md:flex-row md:shrink-0 md:gap-3">
            <a
              href={ASK_HREF}
              className={`flex h-13.5 items-center justify-center gap-2.5 rounded-full bg-[#FFFDF8] text-[17px] font-bold text-[#0E4B5A] md:h-14 md:px-6.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
            >
              <ChatIcon className="size-5" />
              Écrire sur WhatsApp
            </a>
            <Link
              href={GUIDE_HREF}
              className="flex h-13.5 items-center justify-center gap-2 rounded-full border-[1.5px] border-[#7FA9B2] text-[17px] font-semibold text-white md:h-14 md:px-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Voir le guide
              <ArrowIcon className="size-4.5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
