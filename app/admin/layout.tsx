import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/src/corpus/db";
import { AdminNav } from "./AdminNav";

async function PendingAdminNav() {
  await connection();
  const pendingCount = await prisma.contribution.count({ where: { status: "PENDING" } });
  return <AdminNav pendingCount={pendingCount} />;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-275 flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-4 border-b border-sable/40 pb-5">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-display text-2xl">Admin</h1>
          <Link
            href="/"
            className="font-mono text-xs tracking-wide text-encre/60 underline decoration-dotted underline-offset-2 hover:text-mediterranee"
          >
            ← Voir le site
          </Link>
        </div>
        <Suspense>
          <PendingAdminNav />
        </Suspense>
      </header>
      <div className="w-full min-w-0">
        <Suspense fallback={<p className="text-sm text-encre/60">Chargement…</p>}>
          {children}
        </Suspense>
      </div>
    </div>
  );
}
