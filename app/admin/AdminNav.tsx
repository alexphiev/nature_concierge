"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Corpus" },
  { href: "/admin/places", label: "Lieux" },
  { href: "/admin/ingest", label: "Nouvelle capture" },
  { href: "/admin/statut", label: "Statut du jour" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 basis-[45%] rounded-full border px-3.5 py-1.5 text-center font-mono text-xs tracking-wide uppercase transition-colors ${
              active
                ? "border-mediterranee bg-mediterranee text-calcaire"
                : "border-sable/45 text-encre/70 hover:border-mediterranee hover:text-mediterranee"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
