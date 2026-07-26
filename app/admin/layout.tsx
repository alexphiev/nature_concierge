import Link from "next/link";
import { AdminNav } from "./AdminNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-8 px-4 py-8">
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
        <AdminNav />
      </header>
      {children}
    </div>
  );
}
