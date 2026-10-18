import Link from "next/link";
import { getContributorTipCount, getRecentContributorTips } from "../../corpus/community";
import { CONTAINER, FOCUS_RING } from "./shared";

const MIN_TIPS = 3;
const TIP_LIMIT = 4;

export async function RecentTipsSection() {
  if ((await getContributorTipCount()) < MIN_TIPS) return null;
  const tips = await getRecentContributorTips(TIP_LIMIT);

  return (
    <section className={`${CONTAINER} flex flex-col gap-4 pb-10 md:gap-7 md:pb-22`}>
      <h2 className="font-landing-display text-[24px] font-semibold md:text-[36px]">
        Derniers conseils partagés
      </h2>
      <ul role="list" className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-5">
        {tips.map((tip) => (
          <li
            key={tip.id}
            className="flex flex-col gap-3 rounded-2xl border border-[#E4DACA] bg-[#FFFDF8] p-4.5 md:rounded-[18px] md:p-6"
          >
            <p className="text-[15px] leading-[1.5] whitespace-pre-line text-[#1D2A2E] md:text-[16px]">
              {tip.text}
            </p>
            <div className="mt-auto flex flex-col gap-0.5 text-[13px] text-[#5B6663] md:text-[14px]">
              <span>
                {tip.authorName}
                {tip.authorCommune ? ` · ${tip.authorCommune}` : ""}
              </span>
              <Link
                href={`/lieux/${tip.place.slug}`}
                className={`font-semibold text-[#0E4B5A] ${FOCUS_RING}`}
              >
                {tip.place.name}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
