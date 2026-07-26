import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/src/corpus/db";

export const metadata: Metadata = {
  title: "Admin — Nature Concierge",
  robots: { index: false, follow: false },
};

type DraftWithRelations = {
  id: string;
  createdAt: Date;
  status: string;
  place: {
    name: string;
    slug: string;
  };
  blocks: Array<{
    status: string;
    draftClaims: unknown;
  }>;
};

function draftPreview(draft: DraftWithRelations): string {
  const blockCount = draft.blocks.length;
  const claimCount = draft.blocks.reduce((sum, block) => {
    const claims = Array.isArray(block.draftClaims) ? block.draftClaims : [];
    return sum + claims.length;
  }, 0);

  return `${blockCount} source${blockCount > 1 ? "s" : ""} · ${claimCount} revendication${claimCount > 1 ? "s" : ""}`;
}

function DraftSection({
  title,
  drafts,
}: {
  title: string;
  drafts: DraftWithRelations[];
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
                {draft.createdAt.toISOString().slice(0, 10)}
              </span>
              <Link
                href={`/admin/review/${draft.id}`}
                className="block text-mediterranee underline hover:no-underline"
              >
                <p className="font-medium">{draft.place.name}</p>
              </Link>
              <p className="text-xs text-encre/70">{draftPreview(draft)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AdminDashboardPage() {
  await connection();

  const drafts = await prisma.ingestionDraft.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      place: {
        select: { name: true, slug: true },
      },
      blocks: {
        select: { status: true, draftClaims: true },
      },
    },
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
