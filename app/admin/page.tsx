import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/src/corpus/db";

export const metadata: Metadata = {
  title: "Admin — Guide Nature de La Ciotat",
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

const STATUS_ACCENT: Record<string, string> = {
  PENDING_REVIEW: "border-l-statut-orange",
  ERROR: "border-l-statut-rouge",
  APPROVED: "border-l-statut-vert",
  REJECTED: "border-l-statut-inconnu",
};

const SHORTCUTS = [
  {
    href: "/admin/places",
    label: "Lieux",
    description: "Tous les lieux, leur statut de publication et leurs claims.",
  },
  {
    href: "/admin/ingest",
    label: "Nouvelle capture",
    description: "Soumettre une source à extraire pour un lieu.",
  },
  {
    href: "/admin/statut",
    label: "Statut du jour",
    description: "Confirmer ou mettre à jour les signaux du jour par zone.",
  },
];

function AdminShortcuts() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {SHORTCUTS.map((shortcut) => (
        <Link
          key={shortcut.href}
          href={shortcut.href}
          className="rounded-2xl border border-sable/45 bg-calcaire p-4 transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-mediterranee hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
        >
          <p className="font-mono text-xs tracking-wide text-pin uppercase">{shortcut.label}</p>
          <p className="mt-1.5 text-sm text-encre/75">{shortcut.description}</p>
        </Link>
      ))}
    </div>
  );
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
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              className={`rounded-[10px] border border-l-4 border-sable/40 bg-calcaire-deep p-3.5 text-sm ${STATUS_ACCENT[draft.status] ?? ""}`}
            >
              <span className="font-mono text-xs text-encre/70">
                {draft.createdAt.toISOString().slice(0, 10)}
              </span>
              <Link
                href={`/admin/review/${draft.id}`}
                className="block text-mediterranee underline hover:no-underline"
              >
                <p className="font-display text-lg leading-tight">{draft.place.name}</p>
              </Link>
              <p className="mt-1 text-xs text-encre/70">{draftPreview(draft)}</p>
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
    <main className="flex flex-col gap-10">
      <AdminShortcuts />
      <div className="flex flex-col gap-8">
        <h2 className="font-display text-2xl">Corpus — brouillons</h2>
        <DraftSection title="À relire" drafts={byStatus.PENDING_REVIEW} />
        <DraftSection title="Erreurs" drafts={byStatus.ERROR} />
        <DraftSection title="Approuvés récemment" drafts={byStatus.APPROVED} />
        <DraftSection title="Rejetés récemment" drafts={byStatus.REJECTED} />
      </div>
    </main>
  );
}
