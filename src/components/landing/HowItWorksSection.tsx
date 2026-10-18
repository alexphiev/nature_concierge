import Link from "next/link";
import { CONTAINER, CONTRIBUTE_HREF, FOCUS_RING } from "./shared";

const STEPS = [
  { title: "Vous partagez", text: "Une astuce, une correction, un lieu, des photos." },
  { title: "Alexandre relit", text: "Sous quelques jours." },
  { title: "C’est en ligne", text: "Avec votre nom." },
];

export function HowItWorksSection() {
  return (
    <section className={`${CONTAINER} flex flex-col gap-4 pb-10 md:gap-7 md:pb-22`}>
      <h2 className="font-landing-display text-[24px] font-semibold md:text-[36px]">
        Comment ça marche
      </h2>
      <ol role="list" className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-5">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex flex-col gap-1.5 rounded-2xl border border-[#E4DACA] bg-[#FFFDF8] p-4.5 md:rounded-[18px] md:p-6"
          >
            <span className="font-landing-display text-[22px] font-semibold text-[#A34A25]">
              {index + 1}
            </span>
            <h3 className="font-landing-display text-[19px] font-semibold">{step.title}</h3>
            <p className="text-[15px] leading-[1.5] text-[#3E4A4B]">{step.text}</p>
          </li>
        ))}
      </ol>
      <Link
        href={CONTRIBUTE_HREF}
        className={`flex h-12.5 items-center justify-center self-start rounded-full bg-[#0E4B5A] px-6 text-[16px] font-semibold text-white ${FOCUS_RING}`}
      >
        Contribuer
      </Link>
    </section>
  );
}
