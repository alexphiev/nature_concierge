import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/src/corpus/db";
import { CONTRIBUTION_TYPE_LABELS, TIP_THEMES } from "@/src/contributions/schema";
import { SubmitButton } from "@/src/components/SubmitButton";
import { publishTip, rejectContribution } from "./actions";

export const metadata: Metadata = {
  title: "Contributions — Admin",
  robots: { index: false, follow: false },
};

const inputClass = "w-full min-w-0 rounded-[10px] border border-sable/40 bg-calcaire-deep p-3";
const cardClass = "flex flex-col gap-4 rounded-[10px] border border-sable/40 p-4";

export default async function AdminContributionsPage() {
  await connection();
  const contributions = await prisma.contribution.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: true, place: true },
  });

  if (contributions.length === 0) {
    return <p className="text-sm text-encre/60">Aucune contribution à relire.</p>;
  }

  return (
    <ul className="flex flex-col gap-6">
      {contributions.map((c) => (
        <li key={c.id} className={cardClass}>
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-mono text-xs tracking-wide text-encre/60 uppercase">
              {CONTRIBUTION_TYPE_LABELS[c.type]} · {c.createdAt.toLocaleDateString("fr-FR")}
            </p>
            {c.place && (
              <p>
                <Link
                  href={`/lieux/${c.place.slug}`}
                  className="font-medium underline decoration-dotted underline-offset-2"
                >
                  {c.place.name}
                </Link>
              </p>
            )}
            {c.user && (
              <p className="text-encre/70">
                {c.user.name}
                {c.user.commune ? ` (${c.user.commune})` : ""} · {c.user.email}
              </p>
            )}
          </div>

          {c.type === "TIP" ? (
            <>
              <form action={publishTip.bind(null, c.id)} className="flex flex-col gap-3">
                <textarea
                  name="text"
                  defaultValue={c.text ?? ""}
                  required
                  minLength={10}
                  maxLength={500}
                  rows={4}
                  aria-label="Texte de l'astuce"
                  className={inputClass}
                />
                <select
                  name="claimType"
                  defaultValue={c.claimType ?? "TIP"}
                  aria-label="Thème"
                  className={inputClass}
                >
                  {TIP_THEMES.map((theme) => (
                    <option key={theme.value} value={theme.value}>
                      {theme.label}
                    </option>
                  ))}
                </select>
                <textarea
                  name="note"
                  rows={2}
                  placeholder="Commentaire pour l'auteur (optionnel)"
                  aria-label="Commentaire de publication"
                  className={inputClass}
                />
                <SubmitButton className="self-start rounded-full bg-mediterranee px-4 py-2 text-sm text-calcaire">
                  Publier
                </SubmitButton>
              </form>
              <form
                action={rejectContribution.bind(null, c.id)}
                className="flex flex-col gap-3 border-t border-sable/40 pt-4"
              >
                <textarea
                  name="note"
                  rows={2}
                  placeholder="Motif du refus (optionnel)"
                  aria-label="Motif du refus"
                  className={inputClass}
                />
                <SubmitButton className="self-start rounded-full border border-sable/45 px-4 py-2 text-sm text-encre/70">
                  Refuser
                </SubmitButton>
              </form>
            </>
          ) : (
            <>
              {c.text && <p className="whitespace-pre-wrap text-sm">{c.text}</p>}
              <p className="text-sm text-encre/60">Bientôt</p>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
