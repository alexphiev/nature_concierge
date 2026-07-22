import type { Metadata } from "next";
import { prisma } from "@/src/corpus/db";
import type { IngestionDraft } from "../../prisma/generated/client";

export const metadata: Metadata = {
  title: "Admin — Nature Concierge",
  robots: { index: false, follow: false },
};

function draftPreview(draft: IngestionDraft): string {
  if (draft.inputText) {
    return draft.inputText.length > 80
      ? `${draft.inputText.slice(0, 80)}…`
      : draft.inputText;
  }
  if (draft.inputImages.length > 0) return "Capture image";
  return "(entrée vide)";
}

function DraftSection({
  title,
  drafts,
}: {
  title: string;
  drafts: IngestionDraft[];
}) {
  return (
    <section>
      <h2 className="font-display text-xl">
        {title} ({drafts.length})
      </h2>
      {drafts.length === 0 ? (
        <p className="mt-2 text-sm text-encre/70">Aucun brouillon.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              className="rounded-[10px] border border-sable/40 bg-calcaire-deep p-3 text-sm"
            >
              <span className="font-mono text-xs text-encre/70">
                {draft.createdAt.toISOString()}
              </span>
              <p>{draftPreview(draft)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AdminDashboardPage() {
  const drafts = await prisma.ingestionDraft.findMany({
    orderBy: { createdAt: "desc" },
  });

  const byStatus = {
    PENDING_REVIEW: drafts.filter((d) => d.status === "PENDING_REVIEW"),
    ERROR: drafts.filter((d) => d.status === "ERROR"),
    APPROVED: drafts.filter((d) => d.status === "APPROVED"),
    REJECTED: drafts.filter((d) => d.status === "REJECTED"),
  };

  return (
    <main className="flex flex-col gap-8">
      <h1 className="font-display text-2xl">Corpus — brouillons</h1>
      <DraftSection title="À relire" drafts={byStatus.PENDING_REVIEW} />
      <DraftSection title="Erreurs" drafts={byStatus.ERROR} />
      <DraftSection title="Approuvés récemment" drafts={byStatus.APPROVED} />
      <DraftSection title="Rejetés récemment" drafts={byStatus.REJECTED} />
    </main>
  );
}
