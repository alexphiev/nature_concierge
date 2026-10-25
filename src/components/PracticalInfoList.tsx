import Link from "next/link";
import type { PublicClaim } from "@/src/corpus/queries";
import { GUIDE_AUTHOR } from "@/src/site";
import { ADD_TIP_LINK, THEME_ACCENTS, THEME_LABELS, ThemeIcon, groupByTheme } from "./ClaimList";

const monthYear = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

function sourceLink(claim: PublicClaim): { href: string; label: string } | null {
  const url = claim.source.urlOrRef;
  if (!url || !/^https?:\/\//.test(url)) return null;
  return {
    href: url,
    label: claim.source.type === "OFFICIAL" ? "Source officielle" : "Source",
  };
}

// Who reported it, only when it is not the guide's own note.
function reporter(claim: PublicClaim): string | null {
  if (claim.authorDeleted) return "Un ancien contributeur";
  if (!claim.author || claim.author.name === GUIDE_AUTHOR.name) return null;
  return claim.author.name;
}

// Practical info: formal, factual, dated and sourced when possible.
export function PracticalInfoList({
  claims,
  title = "Infos pratiques",
  subtitle,
  addHref,
  correctHref,
}: {
  claims: PublicClaim[];
  title?: string;
  subtitle?: string;
  addHref?: string;
  correctHref?: (claimId: string) => string;
}) {
  if (claims.length === 0) return null;

  const groups = groupByTheme(claims);

  return (
    <section aria-label={title} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-[1.625rem] leading-tight font-semibold">{title}</h2>
        {subtitle && <p className="text-sm leading-relaxed text-encre/70">{subtitle}</p>}
      </div>
      <div className="divide-y divide-sable/35 rounded-[14px] border border-sable/45 bg-[#FFFCF6]">
        {groups.map(({ type, claims: groupClaims }) => (
          <section
            key={type}
            aria-label={THEME_LABELS[type]}
            className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-5 sm:p-5"
          >
            <h3
              className={`flex items-center gap-2.5 self-start text-xs font-semibold tracking-wider uppercase ${THEME_ACCENTS[type].label}`}
            >
              <ThemeIcon type={type} className={`size-7 ${THEME_ACCENTS[type].badge}`} />
              {THEME_LABELS[type]}
            </h3>
            <ul className="flex flex-col gap-3.5">
              {groupClaims.map((claim) => {
                const source = sourceLink(claim);
                const by = reporter(claim);
                return (
                  <li key={claim.id} className="flex flex-col gap-1">
                    <p className="max-w-[65ch] leading-relaxed text-pretty">{claim.claimText}</p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-encre/65">
                      <span>
                        {by ? `Signalé par ${by} · ` : "Vérifié en "}
                        {monthYear.format(claim.verifiedOn)}
                      </span>
                      {source && (
                        <>
                          <span aria-hidden>·</span>
                          <a
                            href={source.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-mediterranee underline underline-offset-2"
                          >
                            {source.label} ↗
                          </a>
                        </>
                      )}
                      {correctHref && (
                        <>
                          <span aria-hidden>·</span>
                          <Link
                            href={correctHref(claim.id)}
                            className="text-mediterranee hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
                          >
                            Corriger
                          </Link>
                        </>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      {addHref && (
        <Link href={addHref} className={ADD_TIP_LINK}>
          Ajouter une info pratique
        </Link>
      )}
    </section>
  );
}
